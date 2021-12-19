
export interface PUOssUploadInput {
    file?: Blob;

    fileName: string;
}

export interface PUOssUploadOutput {
    /**
     * 是否成功
     */
    success: boolean;

    /**
     * 消息
     */
    msg?: string;

    /**
     * 要传递的数据
     */
    data?: any;
}

/**
 * 删除的输入
 */
export class PUOssDeleteInput {
    /**
     * 要删除的文件全路径（阿里云OSS使用）
     */
    fileFullPath?: string;
}

/**
 * 删除的输出
 */
export class PUOssDeleteOutput {
    /**
     * 是否成功
     */
    success: boolean;

    /**
     * 消息
     */
    msg?: string;
}

/**
 * 具体OSS上传实现的约束
 */
export interface PUOss {
    upload(input: PUOssUploadInput): Promise<PUOssUploadOutput>;

    delete(input: PUOssDeleteInput): Promise<PUOssDeleteOutput>;
}


