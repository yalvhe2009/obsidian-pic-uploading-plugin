
export interface PUOssUploadInput{
    file?: Blob;

    fileName: string;
}

export interface PUOssUploadOutput{
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
 * 具体OSS上传实现的约束
 */
export interface PUOss{
    upload(input: PUOssUploadInput): Promise<PUOssUploadOutput>;
}


