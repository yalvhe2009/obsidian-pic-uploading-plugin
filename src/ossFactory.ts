import { CloudServiceProviderType } from "./enums";
import { AliOssImpl, AliOssSettingOptions } from "./impls/aliOssUploadImpl";
import { PUOss } from "./interfaces";

/**
 * 云服务提供商工厂
 */
export class OssFactory{

    public static getOssImplObject(type: CloudServiceProviderType, ossProviderSettingsJson: string): PUOss{
        switch(type){
            case CloudServiceProviderType.阿里云:
                let ossSettingObj: AliOssSettingOptions = JSON.parse(ossProviderSettingsJson);
                return new AliOssImpl(ossSettingObj.region, ossSettingObj.accessKeyId,
                    ossSettingObj.accessKeySecret, ossSettingObj.bucket);
            break;
            
            default:
                return null;
        }
    }
}