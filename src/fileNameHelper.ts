import * as moment from "moment";

export interface GetFileNameByRuleInput {
    /**
     * 规则
     */
    rule: string;

    /**
     * 原文件名（含后缀）
     */
    originFileName: string;

    /**
     * 文件的md5
     */
    fileMd5: string;

    /**
     * 基于Obsidian根目录的Markdown路径（当前打开的Markdown文件的路径）
     */
    markdownPath: string;

    /**
     * 要上传图片的路径
     */
    imgPath: string;
}

export class FileNameOrPathHelper {



    public static getFileNameOrPathByRule(input: GetFileNameByRuleInput): string {
        //注意：当前版本暂不支持{picFolder:2}，因其需要考虑不同操作系统，环境不支持，暂不实现
        //rule传入格式样例：fix-dir/{currMarkdownFolder:2}{picFolder:2}/{y}/{m}/{d}/{h}-{i}-{s}-{hash}-{origin}-{rand:6}

        let originFileName = FileNameOrPathHelper.getFileNameExcludeSuffix(input.originFileName);
        let fileSuffix = FileNameOrPathHelper.getFileSuffix(input.originFileName);

        //console.log('处理currMarkdownFolder前的rule：', input.rule);

        //1.查找{currMarkdownFolder}或{currMarkdownFolder:x}
        const regex = /\{currMarkdownFolder(:)?(\d)?\}/gm;
        let m;
        while ((m = regex.exec(input.rule)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            //console.log('匹配到的项目：', m);
            if (m.length != 0 && m[0] === '{currMarkdownFolder}') {
                //只匹配到了{currMarkdownFolder}
                let s1 = input.rule.substring(0, m.index);
                let s2 = input.rule.substring(m.index + m[0].length);
                let markdownBasePath = FileNameOrPathHelper.getPath(input.markdownPath);//把全路径转换为去掉文件名的路径
                //console.log('markDown的基础路径（不含文件名）：', markdownBasePath);

                let tem1 = this.joinPath(s1, markdownBasePath);
                let tem2 = this.joinPath(tem1, s2);
                input.rule = tem2;
                //console.log('Rule为：', input.rule);
            } else {
                //匹配到了：{currMarkdownFolder:x}
                let num: number = parseInt(m[2]);//num 表示：{currMarkdownFolder:x}中的x的值
                let p = this.getLastNLevelPath(input.markdownPath, num);
                //console.log(`获取到倒数${num}级的路径为：`, p);
                let s1 = input.rule.substring(0, m.index);
                let s2 = input.rule.substring(m.index + m[0].length);
                let tem1 = this.joinPath(s1, p);
                let tem2 = this.joinPath(tem1, s2);
                input.rule = tem2;
                //console.log('Rule为：', input.rule);
            }
        }

        const date = new Date();
        let year: number = date.getFullYear();//年
        let month: string | number = date.getMonth() + 1;//月        
        let day: string | number = date.getDate();//日        
        if (month <= 9) {
            month = "0" + month;
        }
        if (day <= 9) {
            day = "0" + day;
        }
        let hour: number = date.getHours();
        let minute: number = date.getMinutes();
        let second: number = date.getSeconds();

        //console.log(`${year}, ${month}, ${day}, ${hour}, ${minute}, ${second}`);
        //{y}/{m}/{d}/{h}-{i}-{s}
        input.rule = input.rule.replace('{y}', `${year}`);
        input.rule = input.rule.replace('{m}', `${month}`);
        input.rule = input.rule.replace('{d}', `${day}`);
        input.rule = input.rule.replace('{h}', `${hour}`);
        input.rule = input.rule.replace('{i}', `${minute}`);
        input.rule = input.rule.replace('{s}', `${second}`);
        input.rule = input.rule.replace('{hash}', `${input.fileMd5}`);
        input.rule = input.rule.replace('{origin}', `${originFileName}`);
        //console.log('时间信息替换完成的路径', input.rule);
        //{rand:x}

        const regex2 = /\{rand:(\d)\}/gm;
        let m2;
        while ((m2 = regex2.exec(input.rule)) !== null) {
            if (m2.index === regex2.lastIndex) {
                regex2.lastIndex++;
            }
            //console.log('匹配到的项目：', m2);
            //匹配到了：{rand:x}
            let num: number = parseInt(m2[1]);//num 表示：{rand:x}中的x的值
            if (num <= 0 || num > 10) {
                throw new Error("Configuration error, num should > 0 or <= 10 in format: '{rand:num}'!");
            }
            let randMin = (10) ** (num - 1);
            let randMax = (9.999999999) * (10) ** (num - 1);
            //console.log(`${randMin}, ${randMax}`);

            let randNum: Number = this.getRandomNum(randMin, randMax);//num位数
            let s1 = input.rule.substring(0, m2.index);
            let s2 = input.rule.substring(m2.index + m2[0].length);
            input.rule = s1 + `${randNum}` + s2;
            //console.log('Rule为：', input.rule);

        }

        input.rule = input.rule + '.' + fileSuffix;

        return input.rule;
    }

    /**
     * 获取从后往前N层的路径；如传入/home/domenic/img/1.jpg,N=2;则结果为：domenic/img；
     * 如果传入路径过短，凑不够N，则有几项返回几项，一项都没有返回空字符串
     * @param path 
     * @param n 
     */
    public static getLastNLevelPath(path: string, n: number, sep = '/'): string {
        let resList: string[] = [];
        let s = path.split(sep);//['', 'home', 'domenic', 'img', '1.jpg']
        //console.log('s为：', s);

        for (let i = s.length - 2; i >= 0; i--) {//从倒数第二个开始遍历
            const item = s[i];
            if (item.length == 0) {
                continue;//空字符串
            }
            if (n == 0) {
                break;
            }
            resList.push(item);
            n--;
        }
        let resList2: string[] = [];
        for (let i = resList.length - 1; i >= 0; i--) {//把顺序正回来
            const item = resList[i];
            resList2.push(item);
        }
        let res = resList2.join('/');
        //console.log(res);
        return res;
    }

    /**
     * 连接路径，保证路径相间处只有一个分隔符
     * @param path1 
     * @param path2 
     * @param sep 
     * @returns 
     */
    public static joinPath(path1: string, path2: string, sep = '/'): string {
        if (path1.length == 0 && path2.length == 0) {
            return '';
        }
        if (path1.length == 0) {
            return path2;
        }
        if (path2.length == 0) {
            return path1;
        }
        let res: string = '';
        if (path1.endsWith(sep)) {
            path1 = path1.substring(0, path1.length - 1);
        }
        if (path2.startsWith(sep)) {
            path2 = path2.substring(1);
        }
        res = path1 + sep + path2;

        return res;
    }

    /**
     * 输入全路径，返回文件名
     * @param path 
     * @param sep 
     * @returns 
     */
    public static getFileName(path: string, sep = '/'): string {
        if (path.length == 0) {
            return '';
        }
        if (path.indexOf(sep) == -1) {
            return path;
        }
        let sp = path.split(sep);
        return sp[sp.length - 1];
    }

    /**
     * 输入文件名，获取不含后缀的文件名；如'abc.jpg'=> 'abc'
     * @param fileName 
     * @returns 
     */
    public static getFileNameExcludeSuffix(fileName: string): string {
        if (fileName.length == 0) {
            return '';
        }
        let idx = fileName.lastIndexOf('.');

        if (idx === -1) {
            return fileName;//没有'.'
        }
        let res = fileName.substring(0, idx);
        return res;
    }

    /**
     * 获取文件的后缀；如输入：abc.jpg => jpg
     * @param fileName 
     * @returns 
     */
    public static getFileSuffix(fileName: string): string {
        if (fileName.length == 0) {
            return '';
        }
        let idx = fileName.lastIndexOf('.');
        if (idx === -1) {
            return '';//没有'.'
        }
        let res = fileName.substring(idx + 1);
        return res;
    }

    /**
     * 输入全路径，返回除去文件名的路径
     * @param path 
     * @param sep 
     */
    public static getPath(path: string, sep = '/'): string {
        if (path.length == 0) {
            return '';
        }
        if (path.indexOf(sep) == -1) {
            return '';
        }
        let sp = path.split(sep);
        console.log('getPath方法，sp：', sp);

        let res = '';
        for (let i = 0; i < sp.length - 1; i++) {//从0到倒数第二项遍历
            const item = sp[i];
            if (item.length == 0) {// /a/b/c.jpg => ['', 'a', 'b', 'c.jpg']=>/a/b
                continue;
            }
            else {
                res += `${sep}${item}`;
            }

        }
        if (sp[0] !== '') {//   a/b/c.jpg => ['a', 'b', 'c.jpg']，但此时为：/a/b/c.jpg
            res = res.substring(1);
        }
        return res;
    }

    /**
     * 生成范围随机数
     * @Min 最小值
     * @Max 最大值
     */
    public static getRandomNum(Min: number, Max: number): Number {
        var Range = Max - Min;
        var Rand = Math.random();
        return (Min + Math.round(Rand * Range));
    }
}