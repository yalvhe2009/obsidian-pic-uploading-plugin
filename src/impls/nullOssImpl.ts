import { PUOss, PUOssDeleteInput, PUOssDeleteOutput, PUOssUploadInput, PUOssUploadOutput } from "src/interfaces";

export class NullOssImpl implements PUOss {

    constructor() {
    }

    /**
     * 同步上传
     * @param input 
     * @returns 
     */
    public async upload(input: PUOssUploadInput): Promise<PUOssUploadOutput> {
        let output: PUOssUploadOutput = {
            success: false,
            msg: 'Please config oss information!'
        };
        return output;
    }

    /**
     * 同步删除单个文件
     * @param input 
     */
    public async delete(input: PUOssDeleteInput): Promise<PUOssDeleteOutput> {
        let output:PUOssDeleteOutput = {
            success: false,
            msg: 'Please config oss information!'
        };
        return output;
    }


}