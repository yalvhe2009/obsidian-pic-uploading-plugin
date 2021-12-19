import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { PUOss, PUOssDeleteInput, PUOssDeleteOutput, PUOssUploadInput } from './interfaces';
import { ClipBoardHelper, ClipBoardReadOutput } from './clipBoardHelper';
import { CloudServiceProviderType } from './enums';
import { OssFactory } from './ossFactory';
import { FileNameOrPathHelper, GetFileNameByRuleInput } from './fileNameHelper';
import file2md5 from 'file2md5';

interface PicUploadPluginSettings {

	/**
	 * 考虑到通用，oss提供方的配置，如AppKey、AppId、Bucket等等采用JSON配置并保存；
	 */
	ossProviderSettingsJson: string;

	/**
	 * 云服务提供商类型
	 */
	cloudServiceProviderType: string;

	/**
	 * 上传前是否重命名
	 */
	isRenameBeforeUpload: string;

	/**
	 * 上传文件名格式
	 */
	fileNameFormat: string;

	/**
	 * 上传完成好，是否自动粘贴至当前位置
	 */
	isAutoPaste: string;
}

const DEFAULT_SETTINGS: PicUploadPluginSettings = {
	ossProviderSettingsJson: '{}',
	cloudServiceProviderType: CloudServiceProviderType.阿里云.toString(),
	isRenameBeforeUpload: 'true',
	fileNameFormat: '',
	isAutoPaste: 'true',
}


export default class PicUploadingPlugin extends Plugin {
	ossUploadImpl: PUOss;
	settings: PicUploadPluginSettings;
	picUploadingModal: PicUploadingModal;

	async onload() {
		await this.loadSettings();

		let typeInt: number = parseInt(this.settings.cloudServiceProviderType);
		this.ossUploadImpl = OssFactory.getOssImplObject(typeInt, this.settings.ossProviderSettingsJson);
		if (this.ossUploadImpl == null) {
			new Notice(`Error, oss provider [${CloudServiceProviderType[typeInt]}] has not implemented! May be implemented it in future!`)
		}
		const ribbonIconEl = this.addRibbonIcon('dice', 'Picture Uploading Plugin', (evt: MouseEvent) => {
			this.picUploadingModal = new PicUploadingModal(this.app, this);
			this.picUploadingModal.open();
		});

		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Upload from clipboard');
		statusBarItemEl.addEventListener('click', async (event) => {
			const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
			let readImageOutput: ClipBoardReadOutput = await ClipBoardHelper.readImage();
			if (readImageOutput.file == null) {
				new Notice("Error, Can't find image from your clipboard!");
				return;
			}
			let file: Blob = readImageOutput.file;
			let file2: File = new File([file], 'PasteFile.png', { type: 'image/png', lastModified: Date.now() });

			if (this.settings.isRenameBeforeUpload === 'true') {
				//打开确认对话框
				new ConfirmFileNameModal(this.app, this, file2).open();
			}
			else {
				//直接上传
				let fullPath: string = await MainHelper.getFullPathByRule(file2, markdownView, this.settings);
				let isAutoPaste = this.settings.isAutoPaste === 'true';
				await MainHelper.upload(file2, this.ossUploadImpl, markdownView, fullPath, isAutoPaste);
			}

		});

		this.addCommand({
			id: 'obsidian-pic-uploading-delete',
			name: 'Delete Selected Picture',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				console.log();
				let selectedText: string = editor.getSelection();
				if (selectedText.length === 0) {
					new Notice('Error, you should select text first!');
					return;
				}

				let deleteInput: PUOssDeleteInput = {
					fileFullPath: selectedText
				}
				let output: PUOssDeleteOutput = await this.ossUploadImpl.delete(deleteInput);
				if (output.success) {
					new Notice(output.msg);
					editor.replaceSelection('');//把选中内容替换为空；
				}
				else {
					new Notice(`Delete error, ${output.msg}`);
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PicUploadingSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class PicUploadingModal extends Modal {
	plugin: PicUploadingPlugin;
	constructor(app: App, plugin: PicUploadingPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		let div2 = contentEl.createDiv({ cls: '' });
		let a = div2.createEl('a', { cls: 'pu-file', text: 'Click to upload file.' });
		let fileInput = a.createEl('input', { type: 'file', attr: { id: 'pic-file' }, cls: '' });//文件选择组件

		fileInput.addEventListener('change', async (event: Event) => {
			let files = fileInput.files;
			let file: File = files.length > 0 ? files[0] : null;
			console.log(file);
			const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (this.plugin.settings.isRenameBeforeUpload === 'true') {
				//打开确认对话框
				new ConfirmFileNameModal(this.app, this.plugin, file).open();
			}
			else {
				//直接上传
				let isAutoPaste = this.plugin.settings.isAutoPaste === 'true';
				let fullPath: string = await MainHelper.getFullPathByRule(file, markdownView, this.plugin.settings);
				await MainHelper.upload(file, this.plugin.ossUploadImpl, markdownView, fullPath, isAutoPaste);
			}

		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ConfirmFileNameModal extends Modal {
	plugin: PicUploadingPlugin;
	file: File;
	constructor(app: App, plugin: PicUploadingPlugin, file: File) {
		super(app);
		this.plugin = plugin;
		this.file = file;
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let fullPath: string = await MainHelper.getFullPathByRule(this.file, markdownView, this.plugin.settings);
		// console.log('全部的路径为：', fullPath);

		let fileName: string = FileNameOrPathHelper.getFileName(fullPath);
		let filePath: string = FileNameOrPathHelper.getPath(fullPath);
		// console.log('fileName', fileName);
		// console.log('filePath', filePath);


		let div1 = contentEl.createDiv({ cls: 'p-t-s' });
		div1.createEl('label', { attr: { for: 'file-path' }, text: 'File Path:' });
		let filePathInput = div1.createEl('input', { type: 'text', value: filePath, attr: { id: 'file-path' }, cls: 'middle-width' });

		let div2 = contentEl.createDiv({ cls: 'p-t-s' });
		div2.createEl('label', { attr: { for: 'file-name' }, text: 'File Name:' });
		let fileNameInput = div2.createEl('input', { type: 'text', value: fileName, attr: { id: 'file-name' }, cls: 'middle-width' });



		let confirmDiv = contentEl.createDiv({});
		let okBtn = confirmDiv.createEl('input', { type: 'button', value: 'OK', cls: 'pu-btn' });
		okBtn.addEventListener('click', async (event) => {
			let modifiedFullName = FileNameOrPathHelper.joinPath(filePathInput.value, fileNameInput.value);//修改过后的全路径文件名
			okBtn.disabled = true;//锁定按键，防止重复按下
			let isAutoPaste = this.plugin.settings.isAutoPaste === 'true';
			await MainHelper.upload(this.file, this.plugin.ossUploadImpl, markdownView, modifiedFullName, isAutoPaste);
			this.close();
			if (this.plugin.picUploadingModal != null) {
				this.plugin.picUploadingModal.close();//关闭文件选择对话框
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class PicUploadingSettingTab extends PluginSettingTab {
	plugin: PicUploadingPlugin;

	constructor(app: App, plugin: PicUploadingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Obsidian Picture Uploading Plugin Setting' });


		new Setting(containerEl)
			.setName('oss provider setting')
			.setDesc('select one cloud service provider(oss)')
			.setTooltip('this setting needs restart the application.')
			.addDropdown(dropdown => {

				for (const item in CloudServiceProviderType) {
					if (!isNaN(Number(item))) {
						dropdown.addOption(item, CloudServiceProviderType[item]);
					}
				}

				dropdown.setValue(this.plugin.settings.cloudServiceProviderType);
				dropdown.onChange(async (value) => {
					this.plugin.settings.cloudServiceProviderType = value;
					await this.plugin.saveSettings();
				})

			});

		new Setting(containerEl)
			.setName('oss provider setting')
			.setDesc('setting of cloud service provider(oss), and it is json.')
			.setTooltip('this setting needs restart the application.')
			.addTextArea(text => {
				text.setPlaceholder('eg: {"key": "val",...}')
					.setValue(this.plugin.settings.ossProviderSettingsJson)
					.onChange(async (value) => {
						this.plugin.settings.ossProviderSettingsJson = value;
						await this.plugin.saveSettings();
					})
			});

		new Setting(containerEl)
			.setName('paste automatically after upload')
			.setDesc('If you set it true, this plugin will paste markdown image text after upload.')
			.addDropdown(dropdown => {
				dropdown.addOption('true', 'true');
				dropdown.addOption('false', 'false');
				dropdown.onChange(async val => {
					this.plugin.settings.isAutoPaste = val;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('rename before upload')
			.setDesc('If you set it true, this plugin will popup a dialog that you can change the filename.')
			.addDropdown(dropdown => {
				dropdown.addOption('true', 'true');
				dropdown.addOption('false', 'false');
				dropdown.onChange(async val => {
					this.plugin.settings.isRenameBeforeUpload = val;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('File name foramt')
			.setDesc('')
			.addText(text => {
				text.setValue(this.plugin.settings.fileNameFormat)
					.onChange(async val => {
						this.plugin.settings.fileNameFormat = val;
						await this.plugin.saveSettings();
					});
			});

	}
}

/**
 * 主程序的Helper
 */
export class MainHelper {
	public static async getFullPathByRule(file: File, markdownView: MarkdownView, settings: PicUploadPluginSettings): Promise<string> {
		if (file == null) {
			throw new Error("Error, file object is null!");
		}
		if (markdownView == null) {
			throw new Error("Error, please open a markdown file first!");
		}
		let md5Val = await file2md5(file, { chunkSize: 3 * 1024 * 1024 });

		let getFileNameByRuleInput: GetFileNameByRuleInput = {
			rule: settings.fileNameFormat,
			imgPath: '',//当前版本暂不实现
			markdownPath: markdownView.file.path,
			originFileName: file.name,//原始文件名
			fileMd5: md5Val,
		};
		//console.log('获取文件路径规则的输入：', getFileNameByRuleInput);

		//把规则转换为文件路径
		let fileName = FileNameOrPathHelper.getFileNameOrPathByRule(getFileNameByRuleInput);
		//console.log('getFullPathByRule响应：', fileName);
		return fileName;
	}


	public static async upload(file: File, ossUploadImpl: PUOss, markdownView: MarkdownView, newFileName: string = '', autoPaste: boolean = false) {
		if (file) {
			if (newFileName.length == 0) {
				newFileName = file.name;
			}
			//console.log('上传前的文件名：', newFileName);

			let ossUploadInput: PUOssUploadInput = {
				file: file,
				fileName: newFileName
			};
			let ossUploadOutput = await ossUploadImpl.upload(ossUploadInput);
			//console.log("ossUploadOutput", ossUploadOutput);

			if (ossUploadOutput.success) {
				new Notice('File upload succeed!');
				let markdownPicPath: string = `![](${ossUploadOutput.data})`;
				ClipBoardHelper.writeText(markdownPicPath);
				if (autoPaste) {//上传完成后是否自动粘贴
					markdownView.editor.replaceSelection(markdownPicPath);
				}
			}
			else {
				new Notice(`File upload faild! detail: ${ossUploadOutput.msg}`);
			}
		} else {
			new Notice('File object is null!');
		}

	}
}