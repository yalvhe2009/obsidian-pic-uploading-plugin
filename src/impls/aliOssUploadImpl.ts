import { PUOss, PUOssUploadInput, PUOssUploadOutput } from "src/interfaces";


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


}