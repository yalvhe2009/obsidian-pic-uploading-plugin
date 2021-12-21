import { PUOss, PUOssDeleteInput, PUOssDeleteOutput, PUOssUploadInput, PUOssUploadOutput } from "src/interfaces";


export interface AliOssSettingOptions {
    region: string,
    accessKeyId: string,
    accessKeySecret: string,
    bucket: string,
}

export class AliOssImpl implements PUOss {
    private client: any;

    constructor(region: string, accessKeyId: string, accessKeySecret: string, bucket: string) {
        let OSS = require('ali-oss');
        let options: AliOssSettingOptions = {
            region: region,
            accessKeyId: accessKeyId,
            accessKeySecret: accessKeySecret,
            bucket: bucket,
        };
        this.client = new OSS(options);
    }

    /**
     * 同步上传
     * @param input 
     * @returns 
     */
    public async upload(input: PUOssUploadInput): Promise<PUOssUploadOutput> {
        let output: PUOssUploadOutput = {
            success: true,
        };
        try {
            let r1 = await this.client.put(input.fileName, input.file);
            console.log('put success: %j', r1);
            output.data = r1.url;
        } catch (e) {
            console.error('error: %j', e);
            output.success = false;
            output.msg = `${e}`;
        }

        return output;
    }

    /**
     * 同步删除单个文件
     * @param input 
     */
    public async delete(input: PUOssDeleteInput): Promise<PUOssDeleteOutput> {
        let output: PUOssDeleteOutput = {
            success: true
        };
        let delNum: number = 0;
        let matchNum: number = 0;//正则表达式匹配到的个数
        //把格式：![](http://ali.com/a/b/c.jpg)里的：/a/b/c.jpg捕获出来
        const regex = /!\[.*\]\(http(?:s)?:\/\/(?:[A-z0-9][A-z0-9\-]{0,61}[A-z0-9].)+[A-z]{2,6}(\/.*)\)/gm;
        let m;
        let decodeText = '';
        while ((m = regex.exec(input.fileFullPath)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            console.log('删除时匹配文件名的匹配项目：', m);
            //选中内容中有几个图片，就报错，不允许
            let fileFullPath = m[1];
            decodeText = decodeURI(fileFullPath);
            matchNum++;
        }
        if (matchNum===0) {
            output.success = false;
            output.msg = `Content you selected isn't a valid markdown image format!`;
            return output;
        }
        else if(matchNum > 1){
            output.success = false;
            output.msg = `You can noly select one markdown image, but you selected ${matchNum}!`;
            return output;
        }

        console.log('解码后的Text：', decodeText);
        try {
            await this.client.head(decodeText, {});//判断文件是否存在，若不存在，会抛出异常            
            let result = await this.client.delete(decodeText);
        } catch (e) {
            output.success = false;
            output.msg = `${e}`;
        }
        
        return output;
    }


}