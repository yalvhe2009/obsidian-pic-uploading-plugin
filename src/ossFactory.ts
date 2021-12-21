import { CloudServiceProviderType } from "./enums";
import { AliOssImpl, AliOssSettingOptions } from "./impls/aliOssImpl";
import { NullOssImpl } from "./impls/nullOssImpl";
import { PUOss } from "./interfaces";

/**
 * 云服务提供商工厂
 */
export class OssFactory{

    public static getOssImplObject(type: CloudServiceProviderType, ossProviderSettingsJson: string): PUOss{
        switch(type){
            case CloudServiceProviderType.阿里云:
                if (ossProviderSettingsJson === '{}') {//从未配置过
                    return new NullOssImpl();
                }
                let ossSettingObj: AliOssSettingOptions = null;
                try {
                    ossSettingObj = JSON.parse(ossProviderSettingsJson);
                } catch (error) {
                    console.log('把配置的Oss Json转换为对象时出错，详情：', error);                    
                }
                if (ossSettingObj === null) {
                    return new NullOssImpl();
                }
                let res:PUOss = null;
                try {
                    res = new AliOssImpl(ossSettingObj.region, ossSettingObj.accessKeyId,
                        ossSettingObj.accessKeySecret, ossSettingObj.bucket);
                } catch (error) {
                    console.log('尝试创建阿里OSS客户端时出错，详情：', error);                    
                }
                if (res === null) {
                    return new NullOssImpl();
                }
                return res;
            break;
            
            default:
                return null;
        }
    }
}