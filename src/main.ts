import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { PUOss, PUOssUploadInput } from './interfaces';
import { ClipBoardHelper, ClipBoardReadOutput } from './clipBoardHelper';
import { CloudServiceProviderType } from './enums';
import { OssFactory } from './ossFactory';



// Remember to rename these classes and interfaces!

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

	async onload() {
		await this.loadSettings();
		
		let typeInt:number = parseInt(this.settings.cloudServiceProviderType);
		this.ossUploadImpl = OssFactory.getOssImplObject(typeInt, this.settings.ossProviderSettingsJson);
		if(this.ossUploadImpl == null){
			new Notice(`Error, oss provider [${CloudServiceProviderType[typeInt]}] has not implemented! May be implemented it in future!`)
		}
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Picture Uploading Plugin', (evt: MouseEvent) => {
			new PicUploadingModal(this.app, this).open();
		});
		// Perform additional things with the ribbon
		//ribbonIconEl.addClass('my-plugin-ribbon-class');

		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Upload from clipboard');
		statusBarItemEl.addEventListener('click', async (event) => {
			const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (markdownView) {
				let doc = markdownView.editor.getDoc();
				console.log('当前Markdown路径为：', markdownView.file.path)
			}

			let readImageOutput: ClipBoardReadOutput = await ClipBoardHelper.readImage();
			let file = readImageOutput.file;
			console.log('读取到的文件为', file);

			if (file) {
				let ossUploadInput: PUOssUploadInput = {
					file: file,
					fileName: 'defaultClipboardFileName'
				};
				new Notice(`Start to upload file!`);
				let ossUploadOutput = await this.ossUploadImpl.upload(ossUploadInput);
				console.log("ossUploadOutput", ossUploadOutput);

				if (ossUploadOutput.success) {
					new Notice('File upload succeed!');
					ClipBoardHelper.writeText(`![](${ossUploadOutput.data})`);
				}
				else {
					new Notice(`File upload faild! detail: ${ossUploadOutput.msg}`);
				}
			} else {
				new Notice('Can not find image from your clipboard!');
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
		let div1 = contentEl.createDiv({ cls: 'p-t-s' });
		div1.createEl('label', { attr: { for: 'custom-file-name' }, text: 'Custom File Name:' });//自定义文件名
		let fileNameInput = div1.createEl('input', { type: 'text', attr: { id: 'custom-file-name' }, cls: 'pic-uploading-plugin-input' });//自定义文件名
		let div2 = contentEl.createDiv({ cls: 'p-t-s' });
		div2.createEl('label', { attr: { for: 'pic-file' }, text: 'File:' });
		let fileInput = div2.createEl('input', { type: 'file', attr: { id: 'pic-file' }, cls: 'pic-uploading-plugin-input' });//文件选择组件
		let div3 = contentEl.createDiv({ cls: 'p-t-s' });
		div3.createEl('label', { attr: { for: 'url-of-file' }, text: 'URL of File:' });
		let urlInput = div3.createEl('input', { type: 'text', attr: { id: 'url-of-file' }, cls: 'pic-uploading-plugin-input' });//文件上传成功后的url
		fileInput.addEventListener('change', async (event: Event) => {
			console.log(event);
			let files = fileInput.files;
			let file: File = files.length > 0 ? files[0] : null;
			console.log(file);

			if (file) {
				let ossUploadInput: PUOssUploadInput = {
					file: file,
					fileName: 'defaultFileName'
				};
				let ossUploadOutput = await this.plugin.ossUploadImpl.upload(ossUploadInput);
				console.log("ossUploadOutput", ossUploadOutput);

				if (ossUploadOutput.success) {
					new Notice('File upload succeed!');
					ClipBoardHelper.writeText(`![](${ossUploadOutput.data})`);
				}
				else {
					new Notice(`File upload faild! detail: ${ossUploadOutput.msg}`);
				}
			} else {
				new Notice('File object is null!');
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

		containerEl.createEl('h2', { text: 'OSS Provider Setting' });


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
				dropdown.onChange(async (value)=>{
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

	}
}
