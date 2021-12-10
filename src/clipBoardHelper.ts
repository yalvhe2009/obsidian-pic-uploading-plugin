import * as clipboard from "clipboard-polyfill";

export interface ClipBoardReadOutput{
    file?: Blob;
}

export class ClipBoardHelper{

    public static async readImage(): Promise<ClipBoardReadOutput>{
        let readOutput = await clipboard.read();
        console.log('read读取到的内容', readOutput);
        
        let imgFile: Blob = null;

        for (let i = 0; i < readOutput.length; i++) {
            const x = readOutput[i];
            let startWithImageTypes = x.types.filter(type => type.startsWith('image'));
            console.log("以image开头的Type：", startWithImageTypes);
            if(startWithImageTypes.length > 0){
                imgFile = await x.getType(startWithImageTypes[0]);//取第一个图片类型的mine type
            }
        }
        return {file: imgFile};
    }

    public static async writeText(text: string): Promise<void>{
        await clipboard.writeText(text);
    }
}