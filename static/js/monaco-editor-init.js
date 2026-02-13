// Monaco Editor 初始化和管理模块
// 提供类似 VS Code 的代码编辑体验

let monacoEditor = null;
let monacoLoaded = false;
let monacoLoadPromise = null;
let currentLanguage = 'c'; // 当前编程语言

// Monaco Editor CDN 配置
const MONACO_VERSION = '0.45.0';
const MONACO_CDN = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min`;

// 加载 Monaco Editor（使用 ESM 方式避免 AMD 冲突）
function loadMonacoEditor() {
    if (monacoLoadPromise) {
        return monacoLoadPromise;
    }
    
    if (monacoLoaded && window.monaco) {
        return Promise.resolve();
    }

    monacoLoadPromise = new Promise((resolve, reject) => {
        // 保存原有的 require（如果存在）
        const originalRequire = window.require;
        const originalDefine = window.define;
        
        // 加载 Monaco 的 loader
        const loaderScript = document.createElement('script');
        loaderScript.src = `${MONACO_CDN}/vs/loader.js`;
        
        loaderScript.onload = () => {
            // 使用 Monaco 自己的 require
            const monacoRequire = window.require;
            
            if (!monacoRequire || !monacoRequire.config) {
                reject(new Error('Monaco loader 加载失败'));
                return;
            }
            
            // 配置 Monaco 路径
            monacoRequire.config({
                paths: { 'vs': `${MONACO_CDN}/vs` }
            });
            
            // 加载 Monaco Editor
            monacoRequire(['vs/editor/editor.main'], function() {
                monacoLoaded = true;
                console.log('Monaco Editor 加载完成');
                
                // 恢复原有的 require（如果需要）
                if (originalRequire && originalRequire !== monacoRequire) {
                    window.originalRequire = originalRequire;
                }
                
                resolve();
            }, function(err) {
                reject(new Error('Monaco Editor 模块加载失败: ' + err));
            });
        };
        
        loaderScript.onerror = () => {
            reject(new Error('Monaco loader.js 加载失败'));
        };
        
        document.head.appendChild(loaderScript);
    });
    
    return monacoLoadPromise;
}

// 初始化 Monaco Editor
async function initMonacoEditor(containerId, options = {}) {
    try {
        await loadMonacoEditor();

        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`容器 ${containerId} 不存在`);
        }

        // 如果已经有编辑器实例，先销毁
        if (monacoEditor) {
            monacoEditor.dispose();
            monacoEditor = null;
        }

        // 默认配置
        const defaultOptions = {
            value: options.initialCode || getDefaultCode(options.language || 'c'),
            language: options.language || 'c',
            theme: options.theme || 'vs-dark',
            fontSize: options.fontSize || 14,
            lineNumbers: 'on',
            minimap: { enabled: options.minimap !== false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 4,
            insertSpaces: true,
            folding: true,
            renderLineHighlight: 'all',
            selectOnLineNumbers: true,
            roundedSelection: true,
            cursorStyle: 'line',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            contextmenu: true,
            mouseWheelZoom: true,
            bracketPairColorization: { enabled: true },
            guides: {
                bracketPairs: true,
                indentation: true
            },
            suggest: {
                showKeywords: true,
                showSnippets: true,
                showFunctions: true,
                showVariables: true
            },
            quickSuggestions: {
                other: true,
                comments: false,
                strings: true
            },
            parameterHints: { enabled: true }
        };

        // 合并配置
        const editorOptions = { ...defaultOptions, ...options };

        // 创建编辑器
        monacoEditor = monaco.editor.create(container, editorOptions);
        currentLanguage = options.language || 'c';

        // 注册自动补全
        registerCLanguageCompletions();
        registerPythonCompletions();

        // 注册错误检查
        registerLanguageDiagnostics();

        // 添加快捷键
        registerEditorShortcuts();

        console.log('Monaco Editor 初始化完成');
        return monacoEditor;

    } catch (error) {
        console.error('Monaco Editor 初始化失败:', error);
        throw error;
    }
}

// 默认代码模板
function getDefaultCode(language) {
    const templates = {
        c: `#include <stdio.h>

int main() {
    // 在这里编写你的代码
    
    return 0;
}
`,
        python: `# 在这里编写你的Python代码

def main():
    pass

if __name__ == "__main__":
    main()
`
    };
    return templates[language] || templates.c;
}

// 切换编程语言
function switchLanguage(language) {
    if (!monacoEditor || !window.monaco) return;
    
    currentLanguage = language;
    const model = monacoEditor.getModel();
    
    // 更新语言模式
    monaco.editor.setModelLanguage(model, language);
    
    // 如果编辑器内容是默认模板，则切换到新语言的模板
    const currentCode = monacoEditor.getValue().trim();
    const cDefault = getDefaultCode('c').trim();
    const pyDefault = getDefaultCode('python').trim();
    
    if (currentCode === cDefault || currentCode === pyDefault || currentCode === '') {
        monacoEditor.setValue(getDefaultCode(language));
    }
    
    // 重新验证代码
    setTimeout(validateCode, 100);
    
    console.log('切换到语言:', language);
}

// 获取当前语言
function getCurrentLanguage() {
    return currentLanguage;
}

// 用户定义的符号缓存
let userDefinedSymbols = {
    functions: [],
    variables: [],
    structs: [],
    macros: []
};

// 注册 C 语言自动补全
function registerCLanguageCompletions() {
    if (!window.monaco) return;
    
    // 主补全提供器
    monaco.languages.registerCompletionItemProvider('c', {
        triggerCharacters: ['#', '.', '>', '(', '<'],
        provideCompletionItems: function(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };
            
            // 获取当前行内容
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);
            
            // 解析用户定义的符号
            parseUserDefinedSymbols(model.getValue());
            
            let suggestions = [];
            
            // 检查是否在 #include 后面
            if (textBeforeCursor.match(/#include\s*<?\s*$/)) {
                suggestions = createHeaderSuggestions(range);
            }
            // 检查是否输入 #
            else if (textBeforeCursor.endsWith('#') || textBeforeCursor.match(/^\s*#\s*$/)) {
                suggestions = createPreprocessorSuggestions(range);
            }
            // 普通补全
            else {
                suggestions = [
                    ...createPreprocessorSuggestions(range),
                    ...createKeywordSuggestions(range),
                    ...createTypeSuggestions(range),
                    ...createStdlibSuggestions(range),
                    ...createSnippetSuggestions(range),
                    ...createUserDefinedSuggestions(range)
                ];
            }

            return { suggestions };
        }
    });
}

// 解析用户定义的符号
function parseUserDefinedSymbols(code) {
    userDefinedSymbols = {
        functions: [],
        variables: [],
        structs: [],
        macros: []
    };
    
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 解析函数定义: 返回类型 函数名(参数)
        const funcMatch = line.match(/^\s*(int|void|char|float|double|long|short|unsigned|size_t|bool|\w+\s*\*?)\s+(\w+)\s*\(([^)]*)\)\s*\{?/);
        if (funcMatch && funcMatch[2] !== 'main' && funcMatch[2] !== 'if' && funcMatch[2] !== 'while' && funcMatch[2] !== 'for') {
            const returnType = funcMatch[1].trim();
            const funcName = funcMatch[2];
            const params = funcMatch[3].trim();
            
            userDefinedSymbols.functions.push({
                name: funcName,
                returnType: returnType,
                params: params,
                line: i + 1
            });
        }
        
        // 解析变量声明
        const varMatch = line.match(/^\s*(int|char|float|double|long|short|unsigned|size_t|bool)\s+(\w+)(\s*\[\s*\d*\s*\])?\s*(=|;|,)/);
        if (varMatch) {
            const varType = varMatch[1];
            const varName = varMatch[2];
            const isArray = !!varMatch[3];
            
            userDefinedSymbols.variables.push({
                name: varName,
                type: varType + (isArray ? '[]' : ''),
                line: i + 1
            });
        }
        
        // 解析结构体
        const structMatch = line.match(/^\s*struct\s+(\w+)\s*\{?/);
        if (structMatch) {
            userDefinedSymbols.structs.push({
                name: structMatch[1],
                line: i + 1
            });
        }
        
        // 解析宏定义
        const macroMatch = line.match(/^\s*#define\s+(\w+)(\([^)]*\))?\s+(.+)?/);
        if (macroMatch) {
            userDefinedSymbols.macros.push({
                name: macroMatch[1],
                params: macroMatch[2] || '',
                value: macroMatch[3] || '',
                line: i + 1
            });
        }
    }
}

// 创建用户定义符号的补全建议
function createUserDefinedSuggestions(range) {
    const suggestions = [];
    
    // 用户定义的函数
    for (const func of userDefinedSymbols.functions) {
        suggestions.push({
            label: func.name,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func.params ? `${func.name}(\${1:${func.params}})` : `${func.name}()`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: `用户定义函数\n返回类型: ${func.returnType}\n参数: ${func.params || '无'}\n定义于第 ${func.line} 行`,
            detail: `${func.returnType} ${func.name}(${func.params})`,
            sortText: '0' + func.name, // 优先显示
            range: range
        });
    }
    
    // 用户定义的变量
    for (const v of userDefinedSymbols.variables) {
        suggestions.push({
            label: v.name,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: v.name,
            documentation: `用户定义变量\n类型: ${v.type}\n定义于第 ${v.line} 行`,
            detail: v.type,
            sortText: '0' + v.name,
            range: range
        });
    }
    
    // 用户定义的结构体
    for (const s of userDefinedSymbols.structs) {
        suggestions.push({
            label: 'struct ' + s.name,
            kind: monaco.languages.CompletionItemKind.Struct,
            insertText: 'struct ' + s.name,
            documentation: `用户定义结构体\n定义于第 ${s.line} 行`,
            detail: '结构体',
            sortText: '0struct' + s.name,
            range: range
        });
    }
    
    // 用户定义的宏
    for (const m of userDefinedSymbols.macros) {
        suggestions.push({
            label: m.name,
            kind: monaco.languages.CompletionItemKind.Constant,
            insertText: m.params ? `${m.name}(\${1:})` : m.name,
            insertTextRules: m.params ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            documentation: `宏定义\n值: ${m.value || '(无)'}\n定义于第 ${m.line} 行`,
            detail: '#define ' + m.name + m.params,
            sortText: '0' + m.name,
            range: range
        });
    }
    
    return suggestions;
}

// 头文件补全
function createHeaderSuggestions(range) {
    const headers = [
        { name: 'stdio.h', desc: '标准输入输出 (printf, scanf, FILE等)' },
        { name: 'stdlib.h', desc: '标准库 (malloc, free, atoi, rand等)' },
        { name: 'string.h', desc: '字符串处理 (strlen, strcpy, strcmp等)' },
        { name: 'math.h', desc: '数学函数 (sqrt, pow, sin, cos等)' },
        { name: 'ctype.h', desc: '字符处理 (isalpha, isdigit, toupper等)' },
        { name: 'time.h', desc: '时间日期 (time, clock, localtime等)' },
        { name: 'stdbool.h', desc: '布尔类型 (bool, true, false)' },
        { name: 'stdint.h', desc: '整数类型 (int8_t, uint32_t等)' },
        { name: 'limits.h', desc: '数值限制 (INT_MAX, INT_MIN等)' },
        { name: 'float.h', desc: '浮点数限制 (FLT_MAX, DBL_MIN等)' },
        { name: 'assert.h', desc: '断言 (assert)' },
        { name: 'errno.h', desc: '错误码 (errno)' },
        { name: 'stddef.h', desc: '标准定义 (NULL, size_t, ptrdiff_t)' },
        { name: 'stdarg.h', desc: '可变参数 (va_list, va_start等)' }
    ];
    
    return headers.map(h => ({
        label: h.name,
        kind: monaco.languages.CompletionItemKind.File,
        insertText: h.name + '>',
        documentation: h.desc,
        detail: '标准头文件',
        sortText: '0' + h.name,
        range: range
    }));
}

// 预处理指令补全
function createPreprocessorSuggestions(range) {
    return [
        {
            label: '#include <stdio.h>',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '#include <stdio.h>',
            documentation: '标准输入输出库 (printf, scanf等)',
            sortText: '00include_stdio',
            range: range
        },
        {
            label: '#include <stdlib.h>',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '#include <stdlib.h>',
            documentation: '标准库 (malloc, free, atoi等)',
            sortText: '00include_stdlib',
            range: range
        },
        {
            label: '#include <string.h>',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '#include <string.h>',
            documentation: '字符串处理 (strlen, strcpy等)',
            sortText: '00include_string',
            range: range
        },
        {
            label: '#include <math.h>',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '#include <math.h>',
            documentation: '数学函数 (sqrt, pow等)',
            sortText: '00include_math',
            range: range
        },
        {
            label: '#include',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '#include <${1:stdio.h}>',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '包含头文件',
            sortText: '01include',
            range: range
        },
        {
            label: '#define',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '#define ${1:NAME} ${2:value}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '定义宏',
            sortText: '02define',
            range: range
        },
        {
            label: '#ifdef',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '#ifdef ${1:MACRO}\n$0\n#endif',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '条件编译 (如果定义了宏)',
            sortText: '03ifdef',
            range: range
        },
        {
            label: '#ifndef',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '#ifndef ${1:MACRO}\n#define ${1:MACRO}\n$0\n#endif',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '条件编译 (如果未定义宏) - 常用于头文件保护',
            sortText: '04ifndef',
            range: range
        }
    ];
}

// 关键字补全
function createKeywordSuggestions(range) {
    const keywords = [
        { label: 'if', snippet: 'if (${1:condition}) {\n\t$0\n}', doc: 'if 条件语句' },
        { label: 'else', snippet: 'else {\n\t$0\n}', doc: 'else 分支' },
        { label: 'for', snippet: 'for (${1:int i = 0}; ${2:i < n}; ${3:i++}) {\n\t$0\n}', doc: 'for 循环' },
        { label: 'while', snippet: 'while (${1:condition}) {\n\t$0\n}', doc: 'while 循环' },
        { label: 'do while', snippet: 'do {\n\t$0\n} while (${1:condition});', doc: 'do-while 循环' },
        { label: 'switch', snippet: 'switch (${1:expr}) {\n\tcase ${2:val}:\n\t\t$0\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', doc: 'switch 语句' },
        { label: 'return', snippet: 'return ${1:0};', doc: '返回语句' },
        { label: 'break', snippet: 'break;', doc: '跳出循环' },
        { label: 'continue', snippet: 'continue;', doc: '继续下一次循环' },
        { label: 'struct', snippet: 'struct ${1:Name} {\n\t$0\n};', doc: '结构体定义' }
    ];

    return keywords.map(kw => ({
        label: kw.label,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: kw.snippet,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: kw.doc,
        range: range
    }));
}

// 数据类型补全
function createTypeSuggestions(range) {
    const types = ['int', 'float', 'double', 'char', 'void', 'long', 'short', 
                   'unsigned', 'signed', 'const', 'static', 'size_t', 'FILE'];
    
    return types.map(type => ({
        label: type,
        kind: monaco.languages.CompletionItemKind.TypeParameter,
        insertText: type,
        documentation: `C 语言数据类型: ${type}`,
        range: range
    }));
}

// 标准库函数补全
function createStdlibSuggestions(range) {
    const stdFunctions = [
        { label: 'printf', snippet: 'printf("${1:%s}\\n", ${2:var});', doc: '格式化输出', header: 'stdio.h' },
        { label: 'scanf', snippet: 'scanf("${1:%d}", &${2:var});', doc: '格式化输入', header: 'stdio.h' },
        { label: 'puts', snippet: 'puts(${1:str});', doc: '输出字符串', header: 'stdio.h' },
        { label: 'gets', snippet: 'gets(${1:str});', doc: '输入字符串', header: 'stdio.h' },
        { label: 'getchar', snippet: 'getchar()', doc: '读取单个字符', header: 'stdio.h' },
        { label: 'putchar', snippet: 'putchar(${1:ch});', doc: '输出单个字符', header: 'stdio.h' },
        { label: 'malloc', snippet: 'malloc(${1:size} * sizeof(${2:int}))', doc: '动态分配内存', header: 'stdlib.h' },
        { label: 'free', snippet: 'free(${1:ptr});', doc: '释放内存', header: 'stdlib.h' },
        { label: 'strlen', snippet: 'strlen(${1:str})', doc: '字符串长度', header: 'string.h' },
        { label: 'strcpy', snippet: 'strcpy(${1:dest}, ${2:src});', doc: '复制字符串', header: 'string.h' },
        { label: 'strcmp', snippet: 'strcmp(${1:s1}, ${2:s2})', doc: '比较字符串', header: 'string.h' },
        { label: 'sqrt', snippet: 'sqrt(${1:x})', doc: '平方根', header: 'math.h' },
        { label: 'pow', snippet: 'pow(${1:base}, ${2:exp})', doc: '幂运算', header: 'math.h' },
        { label: 'abs', snippet: 'abs(${1:x})', doc: '绝对值', header: 'stdlib.h' }
    ];

    return stdFunctions.map(fn => ({
        label: fn.label,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: fn.snippet,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `${fn.doc}\n需要: #include <${fn.header}>`,
        detail: `<${fn.header}>`,
        range: range
    }));
}

// 代码片段补全
function createSnippetSuggestions(range) {
    return [
        {
            label: 'main',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '#include <stdio.h>\n\nint main() {\n\t$0\n\treturn 0;\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '主函数模板',
            detail: '代码片段',
            range: range
        },
        {
            label: 'fori',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'for 循环（整数索引）',
            detail: '代码片段',
            range: range
        },
        {
            label: 'pf',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'printf("${1:%d}\\n", ${2:var});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'printf 快捷输入',
            detail: '代码片段',
            range: range
        },
        {
            label: 'sf',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'scanf("${1:%d}", &${2:var});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'scanf 快捷输入',
            detail: '代码片段',
            range: range
        }
    ];
}

// 注册 Python 自动补全
function registerPythonCompletions() {
    if (!window.monaco) return;
    
    monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: function(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };

            return { suggestions: createPythonSuggestions(range) };
        }
    });
}

// Python 补全建议
function createPythonSuggestions(range) {
    const suggestions = [
        // 关键字
        { label: 'if', snippet: 'if ${1:condition}:\n\t$0', doc: 'if 条件语句' },
        { label: 'elif', snippet: 'elif ${1:condition}:\n\t$0', doc: 'elif 分支' },
        { label: 'else', snippet: 'else:\n\t$0', doc: 'else 分支' },
        { label: 'for', snippet: 'for ${1:i} in ${2:range(n)}:\n\t$0', doc: 'for 循环' },
        { label: 'while', snippet: 'while ${1:condition}:\n\t$0', doc: 'while 循环' },
        { label: 'def', snippet: 'def ${1:function_name}(${2:params}):\n\t$0', doc: '函数定义' },
        { label: 'class', snippet: 'class ${1:ClassName}:\n\tdef __init__(self):\n\t\t$0', doc: '类定义' },
        { label: 'try', snippet: 'try:\n\t$0\nexcept ${1:Exception} as e:\n\tpass', doc: 'try-except' },
        { label: 'with', snippet: 'with ${1:open(file)} as ${2:f}:\n\t$0', doc: 'with 语句' },
        { label: 'lambda', snippet: 'lambda ${1:x}: ${2:x}', doc: 'lambda 表达式' },
        { label: 'return', snippet: 'return ${1:value}', doc: '返回语句' },
        { label: 'import', snippet: 'import ${1:module}', doc: '导入模块' },
        { label: 'from', snippet: 'from ${1:module} import ${2:name}', doc: '从模块导入' },
    ];
    
    const builtins = [
        { label: 'print', snippet: 'print(${1:value})', doc: '打印输出' },
        { label: 'input', snippet: 'input(${1:"提示: "})', doc: '获取输入' },
        { label: 'len', snippet: 'len(${1:obj})', doc: '获取长度' },
        { label: 'range', snippet: 'range(${1:n})', doc: '生成范围' },
        { label: 'int', snippet: 'int(${1:value})', doc: '转换为整数' },
        { label: 'float', snippet: 'float(${1:value})', doc: '转换为浮点数' },
        { label: 'str', snippet: 'str(${1:value})', doc: '转换为字符串' },
        { label: 'list', snippet: 'list(${1:iterable})', doc: '转换为列表' },
        { label: 'dict', snippet: 'dict(${1:})', doc: '创建字典' },
        { label: 'set', snippet: 'set(${1:iterable})', doc: '创建集合' },
        { label: 'sorted', snippet: 'sorted(${1:iterable})', doc: '排序' },
        { label: 'enumerate', snippet: 'enumerate(${1:iterable})', doc: '枚举' },
        { label: 'zip', snippet: 'zip(${1:iter1}, ${2:iter2})', doc: '打包' },
        { label: 'map', snippet: 'map(${1:func}, ${2:iterable})', doc: '映射' },
        { label: 'filter', snippet: 'filter(${1:func}, ${2:iterable})', doc: '过滤' },
        { label: 'sum', snippet: 'sum(${1:iterable})', doc: '求和' },
        { label: 'max', snippet: 'max(${1:iterable})', doc: '最大值' },
        { label: 'min', snippet: 'min(${1:iterable})', doc: '最小值' },
        { label: 'abs', snippet: 'abs(${1:x})', doc: '绝对值' },
        { label: 'open', snippet: 'open(${1:"filename"}, ${2:"r"})', doc: '打开文件' },
    ];
    
    const snippets = [
        { label: 'main', snippet: 'def main():\n\t$0\n\nif __name__ == "__main__":\n\tmain()', doc: '主函数模板' },
        { label: 'fori', snippet: 'for ${1:i} in range(${2:n}):\n\t$0', doc: 'for 循环（索引）' },
        { label: 'fore', snippet: 'for ${1:item} in ${2:items}:\n\t$0', doc: 'for 循环（遍历）' },
        { label: 'lc', snippet: '[${1:x} for ${1:x} in ${2:items}]', doc: '列表推导式' },
    ];
    
    const result = [];
    
    suggestions.forEach(s => {
        result.push({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: s.snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: s.doc,
            range: range
        });
    });
    
    builtins.forEach(s => {
        result.push({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: s.snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: s.doc,
            range: range
        });
    });
    
    snippets.forEach(s => {
        result.push({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: s.snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: s.doc,
            detail: '代码片段',
            range: range
        });
    });
    
    return result;
}


// 语言错误检查
function registerLanguageDiagnostics() {
    if (!monacoEditor) return;
    
    monacoEditor.onDidChangeModelContent(() => {
        validateCode();
    });
    
    // 初始验证
    setTimeout(validateCode, 500);
}

// 验证代码（根据当前语言）
function validateCode() {
    if (!monacoEditor || !window.monaco) return;
    
    const model = monacoEditor.getModel();
    const code = model.getValue();
    const markers = [];
    const lines = code.split('\n');
    
    if (currentLanguage === 'c') {
        checkBracketMatching(code, lines, markers);
        checkSemicolons(code, lines, markers);
        checkCommonErrors(code, lines, markers);
        checkHeaders(code, lines, markers);
        checkUndefinedVariables(code, lines, markers);
        checkFunctionCalls(code, lines, markers);
    } else if (currentLanguage === 'python') {
        checkPythonErrors(code, lines, markers);
    }
    
    monaco.editor.setModelMarkers(model, 'code-validator', markers);
}

// 检查分号缺失
function checkSemicolons(code, lines, markers) {
    let inBlockComment = false;
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        let trimmed = line.trim();
        
        // 处理块注释状态
        if (inBlockComment) {
            if (trimmed.includes('*/')) {
                inBlockComment = false;
                // 获取块注释结束后的内容
                const afterComment = trimmed.substring(trimmed.indexOf('*/') + 2).trim();
                if (!afterComment) continue;
                trimmed = afterComment;
            } else {
                continue;
            }
        }
        
        // 检查是否进入块注释
        if (trimmed.includes('/*')) {
            if (!trimmed.includes('*/')) {
                inBlockComment = true;
            }
            // 如果整行都是块注释，跳过
            const beforeComment = trimmed.substring(0, trimmed.indexOf('/*')).trim();
            if (!beforeComment) continue;
            trimmed = beforeComment;
        }
        
        // 跳过空行
        if (!trimmed) continue;
        
        // 跳过单行注释（整行都是注释）
        if (trimmed.startsWith('//')) continue;
        
        // 跳过预处理指令
        if (trimmed.startsWith('#')) continue;
        
        // 跳过块注释行
        if (trimmed.startsWith('*')) continue;
        
        // 移除行内注释后再检查
        const lineWithoutComment = trimmed.replace(/\/\/.*$/, '').trim();
        if (!lineWithoutComment) continue;
        
        // 跳过以 { 或 } 结尾的行
        if (lineWithoutComment.endsWith('{') || lineWithoutComment.endsWith('}') || 
            lineWithoutComment === '{' || lineWithoutComment === '}') {
            continue;
        }
        
        // 跳过控制语句（if, else, for, while, switch, do, case, default）
        if (lineWithoutComment.match(/^(if|else|for|while|switch|do)\s*[\({]?/) ||
            lineWithoutComment.match(/^(if|else|for|while|switch|do)$/) ||
            lineWithoutComment.match(/^else\s*if\s*\(/) ||
            lineWithoutComment.match(/^case\s+.*:$/) ||
            lineWithoutComment.match(/^default\s*:$/)) {
            continue;
        }
        
        // 跳过函数定义行（返回类型 函数名(参数) 后面跟 { 或换行）
        if (lineWithoutComment.match(/^\w+[\s\*]+\w+\s*\([^)]*\)\s*$/)) {
            continue;
        }
        
        // 跳过结构体/枚举定义开始
        if (lineWithoutComment.match(/^(struct|enum|union)\s+\w*\s*\{?$/)) {
            continue;
        }
        
        // 跳过标签（如 case 标签或 goto 标签）
        if (lineWithoutComment.match(/^\w+:\s*$/)) {
            continue;
        }
        
        // 跳过只有右括号的行（如函数参数跨行）
        if (lineWithoutComment.match(/^[\)\]]+[,;]?$/)) {
            continue;
        }
        
        // 跳过以逗号结尾的行（如数组初始化、函数参数跨行）
        if (lineWithoutComment.endsWith(',')) {
            continue;
        }
        
        // 检查是否是语句但没有分号
        // 语句特征：变量声明、赋值、函数调用、return/break/continue 等
        const isStatement = lineWithoutComment.match(/^(return|break|continue)\b/) ||
            lineWithoutComment.match(/^(int|char|float|double|void|long|short|unsigned|const|static|size_t|bool|FILE)\s+/) ||
            lineWithoutComment.match(/^\w+\s*=/) ||
            lineWithoutComment.match(/^\w+\s*\[.*\]\s*=/) ||
            lineWithoutComment.match(/^\w+\s*\(.*\)$/) ||  // 函数调用
            lineWithoutComment.match(/^\+\+\w+|\-\-\w+|\w+\+\+|\w+\-\-/) ||  // 自增自减
            lineWithoutComment.match(/^\*?\w+\s*[\+\-\*\/\%\&\|\^]=/) ||  // 复合赋值
            lineWithoutComment.match(/^free\s*\(/) ||
            lineWithoutComment.match(/^printf\s*\(/) ||
            lineWithoutComment.match(/^scanf\s*\(/);
        
        if (isStatement && !lineWithoutComment.endsWith(';')) {
            // 检查下一行是否是续行（如多行函数调用）
            const nextLineNum = lineNum + 1;
            if (nextLineNum < lines.length) {
                const nextLine = lines[nextLineNum].trim();
                // 如果下一行以 { 开头，或者是控制语句的一部分，跳过
                if (nextLine.startsWith('{') || 
                    nextLine.startsWith('&&') || 
                    nextLine.startsWith('||') ||
                    nextLine.startsWith('?') ||
                    nextLine.startsWith(':') ||
                    nextLine.startsWith(')') ||
                    nextLine.startsWith(']')) {
                    continue;
                }
            }
            
            // 检查是否是多行语句（行末有未闭合的括号）
            let openParens = 0;
            let openBrackets = 0;
            for (const char of lineWithoutComment) {
                if (char === '(') openParens++;
                else if (char === ')') openParens--;
                else if (char === '[') openBrackets++;
                else if (char === ']') openBrackets--;
            }
            if (openParens > 0 || openBrackets > 0) {
                continue; // 有未闭合的括号，可能是多行语句
            }
            
            markers.push({
                severity: monaco.MarkerSeverity.Error,
                message: '可能缺少分号 ";"',
                startLineNumber: lineNum + 1,
                startColumn: line.length,
                endLineNumber: lineNum + 1,
                endColumn: line.length + 1
            });
        }
    }
}

// 检查未定义的变量使用
function checkUndefinedVariables(code, lines, markers) {
    // 收集所有声明的变量
    const declaredVars = new Set(['argc', 'argv', 'NULL', 'EOF', 'stdin', 'stdout', 'stderr', 'true', 'false']);
    const declaredFuncs = new Set(['main', 'printf', 'scanf', 'puts', 'gets', 'getchar', 'putchar', 
        'malloc', 'free', 'calloc', 'realloc', 'strlen', 'strcpy', 'strcat', 'strcmp', 'strncpy',
        'memset', 'memcpy', 'memmove', 'sizeof', 'sqrt', 'pow', 'abs', 'fabs', 'sin', 'cos', 'tan',
        'log', 'exp', 'floor', 'ceil', 'rand', 'srand', 'time', 'atoi', 'atof', 'atol',
        'fopen', 'fclose', 'fread', 'fwrite', 'fprintf', 'fscanf', 'fgets', 'fputs',
        'exit', 'qsort', 'bsearch', 'isalpha', 'isdigit', 'isalnum', 'isspace', 'toupper', 'tolower']);
    
    // 第一遍：收集声明
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        
        // 变量声明
        const varDecl = line.match(/\b(int|char|float|double|long|short|unsigned|size_t|bool|void|FILE)\s+\*?\s*(\w+)/g);
        if (varDecl) {
            for (const decl of varDecl) {
                const match = decl.match(/\b(int|char|float|double|long|short|unsigned|size_t|bool|void|FILE)\s+\*?\s*(\w+)/);
                if (match) declaredVars.add(match[2]);
            }
        }
        
        // 函数定义
        const funcDecl = line.match(/^\s*\w+\s+\*?\s*(\w+)\s*\(/);
        if (funcDecl) {
            declaredFuncs.add(funcDecl[1]);
        }
        
        // for 循环中的变量
        const forVar = line.match(/for\s*\(\s*(int|char|float|double)\s+(\w+)/);
        if (forVar) {
            declaredVars.add(forVar[2]);
        }
        
        // 函数参数
        const funcParams = line.match(/\w+\s*\(([^)]+)\)/);
        if (funcParams && line.match(/^\s*\w+\s+\w+\s*\(/)) {
            const params = funcParams[1].split(',');
            for (const param of params) {
                const paramMatch = param.trim().match(/\w+\s+\*?\s*(\w+)\s*$/);
                if (paramMatch) declaredVars.add(paramMatch[1]);
            }
        }
        
        // #define 宏
        const defineMatch = line.match(/#define\s+(\w+)/);
        if (defineMatch) {
            declaredVars.add(defineMatch[1]);
        }
    }
    
    // 第二遍：检查使用
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        const trimmed = line.trim();
        
        // 跳过注释和预处理
        if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            continue;
        }
        
        // 跳过字符串内容
        const lineWithoutStrings = line.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
        
        // 查找标识符使用
        const identifiers = lineWithoutStrings.match(/\b[a-zA-Z_]\w*\b/g);
        if (identifiers) {
            for (const id of identifiers) {
                // 跳过关键字和类型
                const keywords = ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 
                    'break', 'continue', 'return', 'int', 'char', 'float', 'double', 'void', 
                    'long', 'short', 'unsigned', 'signed', 'const', 'static', 'struct', 'typedef',
                    'enum', 'union', 'sizeof', 'include', 'define', 'ifdef', 'ifndef', 'endif',
                    'bool', 'size_t', 'FILE', 'NULL', 'true', 'false'];
                
                if (keywords.includes(id)) continue;
                if (declaredVars.has(id)) continue;
                if (declaredFuncs.has(id)) continue;
                
                // 检查是否是函数调用
                const funcCallRegex = new RegExp(`\\b${id}\\s*\\(`);
                if (funcCallRegex.test(line)) {
                    // 可能是未声明的函数
                    if (!declaredFuncs.has(id)) {
                        const col = line.indexOf(id);
                        markers.push({
                            severity: monaco.MarkerSeverity.Warning,
                            message: `函数 "${id}" 未声明（可能需要包含相应头文件或前向声明）`,
                            startLineNumber: lineNum + 1,
                            startColumn: col + 1,
                            endLineNumber: lineNum + 1,
                            endColumn: col + id.length + 1
                        });
                    }
                }
            }
        }
    }
}

// 检查函数调用参数
function checkFunctionCalls(code, lines, markers) {
    // 常见函数的参数数量
    const funcParamCounts = {
        'printf': { min: 1, max: 99 },
        'scanf': { min: 1, max: 99 },
        'strlen': { min: 1, max: 1 },
        'strcpy': { min: 2, max: 2 },
        'strcat': { min: 2, max: 2 },
        'strcmp': { min: 2, max: 2 },
        'malloc': { min: 1, max: 1 },
        'free': { min: 1, max: 1 },
        'fopen': { min: 2, max: 2 },
        'fclose': { min: 1, max: 1 },
        'sqrt': { min: 1, max: 1 },
        'pow': { min: 2, max: 2 },
        'abs': { min: 1, max: 1 }
    };
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        
        for (const [func, counts] of Object.entries(funcParamCounts)) {
            const regex = new RegExp(`\\b${func}\\s*\\(([^)]*)\\)`, 'g');
            let match;
            
            while ((match = regex.exec(line)) !== null) {
                const args = match[1].trim();
                if (!args) {
                    if (counts.min > 0) {
                        markers.push({
                            severity: monaco.MarkerSeverity.Error,
                            message: `函数 "${func}" 需要至少 ${counts.min} 个参数`,
                            startLineNumber: lineNum + 1,
                            startColumn: match.index + 1,
                            endLineNumber: lineNum + 1,
                            endColumn: match.index + match[0].length + 1
                        });
                    }
                }
            }
        }
    }
}

// Python 错误检查
function checkPythonErrors(code, lines, markers) {
    let indentStack = [0];
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        const trimmed = line.trim();
        
        // 跳过空行和注释
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        // 检查缩进一致性
        const indent = line.match(/^(\s*)/)[1].length;
        const prevIndent = indentStack[indentStack.length - 1];
        
        // 检查冒号后是否需要缩进
        if (lineNum > 0) {
            const prevLine = lines[lineNum - 1].trim();
            if (prevLine.endsWith(':') && indent <= prevIndent) {
                markers.push({
                    severity: monaco.MarkerSeverity.Error,
                    message: '缺少缩进：冒号后的代码块需要缩进',
                    startLineNumber: lineNum + 1,
                    startColumn: 1,
                    endLineNumber: lineNum + 1,
                    endColumn: line.length + 1
                });
            }
        }
        
        // 检查 print 语句（Python 2 风格）
        if (trimmed.match(/^print\s+[^(]/)) {
            markers.push({
                severity: monaco.MarkerSeverity.Error,
                message: 'Python 3 中 print 是函数，需要使用 print()',
                startLineNumber: lineNum + 1,
                startColumn: 1,
                endLineNumber: lineNum + 1,
                endColumn: 6
            });
        }
        
        // 检查常见拼写错误
        if (trimmed.match(/\bpirnt\b|\bprnit\b|\bpritn\b/)) {
            markers.push({
                severity: monaco.MarkerSeverity.Error,
                message: '拼写错误：是否想输入 "print"？',
                startLineNumber: lineNum + 1,
                startColumn: 1,
                endLineNumber: lineNum + 1,
                endColumn: line.length + 1
            });
        }
        
        // 检查 = 和 == 混淆
        const assignInCondition = trimmed.match(/^(if|elif|while)\s+.*[^=!<>]=(?!=)/);
        if (assignInCondition && !trimmed.includes('==') && !trimmed.includes(':=')) {
            markers.push({
                severity: monaco.MarkerSeverity.Warning,
                message: '在条件语句中使用了 "="，是否应该使用 "==" ？',
                startLineNumber: lineNum + 1,
                startColumn: 1,
                endLineNumber: lineNum + 1,
                endColumn: line.length + 1
            });
        }
    }
}

// 检查括号匹配
function checkBracketMatching(code, lines, markers) {
    const stack = [];
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const closeBrackets = { ')': '(', ']': '[', '}': '{' };
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        let inString = false;
        let inChar = false;
        let escaped = false;
        
        for (let col = 0; col < line.length; col++) {
            const char = line[col];
            
            if (escaped) { escaped = false; continue; }
            if (char === '\\') { escaped = true; continue; }
            if (char === '"' && !inChar) { inString = !inString; continue; }
            if (char === "'" && !inString) { inChar = !inChar; continue; }
            if (inString || inChar) continue;
            
            if (brackets[char]) {
                stack.push({ char, line: lineNum, col });
            } else if (closeBrackets[char]) {
                if (stack.length === 0) {
                    markers.push({
                        severity: monaco.MarkerSeverity.Error,
                        message: `多余的闭括号 '${char}'`,
                        startLineNumber: lineNum + 1,
                        startColumn: col + 1,
                        endLineNumber: lineNum + 1,
                        endColumn: col + 2
                    });
                } else {
                    const last = stack.pop();
                    if (brackets[last.char] !== char) {
                        markers.push({
                            severity: monaco.MarkerSeverity.Error,
                            message: `括号不匹配: 期望 '${brackets[last.char]}' 但找到 '${char}'`,
                            startLineNumber: lineNum + 1,
                            startColumn: col + 1,
                            endLineNumber: lineNum + 1,
                            endColumn: col + 2
                        });
                    }
                }
            }
        }
    }
    
    // 未闭合的括号
    for (const item of stack) {
        markers.push({
            severity: monaco.MarkerSeverity.Error,
            message: `未闭合的括号 '${item.char}'`,
            startLineNumber: item.line + 1,
            startColumn: item.col + 1,
            endLineNumber: item.line + 1,
            endColumn: item.col + 2
        });
    }
}

// 检查常见错误
function checkCommonErrors(code, lines, markers) {
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        
        // 检查 = 和 == 的混淆
        const assignInCondition = line.match(/\b(if|while)\s*\(\s*[^=!<>]*[^=!<>]=(?!=)[^=]/);
        if (assignInCondition) {
            const col = line.indexOf('=', line.indexOf(assignInCondition[1]));
            markers.push({
                severity: monaco.MarkerSeverity.Warning,
                message: '在条件语句中使用了 "="，是否应该使用 "==" ？',
                startLineNumber: lineNum + 1,
                startColumn: col + 1,
                endLineNumber: lineNum + 1,
                endColumn: col + 2
            });
        }
        
        // 检查 scanf 缺少 &
        const scanfMatch = line.match(/scanf\s*\(\s*"[^"]*%[diouxXeEfFgGaAcspn][^"]*"\s*,\s*([a-zA-Z_]\w*)\s*[,)]/);
        if (scanfMatch) {
            const varName = scanfMatch[1];
            if (!line.includes(`&${varName}`) && !line.includes(`${varName}[`)) {
                markers.push({
                    severity: monaco.MarkerSeverity.Error,
                    message: `scanf 中变量 "${varName}" 可能缺少 "&"`,
                    startLineNumber: lineNum + 1,
                    startColumn: line.indexOf(varName) + 1,
                    endLineNumber: lineNum + 1,
                    endColumn: line.indexOf(varName) + varName.length + 1
                });
            }
        }
    }
}

// 检查头文件
function checkHeaders(code, lines, markers) {
    const includedHeaders = new Set();
    
    for (const line of lines) {
        const match = line.match(/#include\s*<([^>]+)>/);
        if (match) includedHeaders.add(match[1]);
    }
    
    const functionHeaders = {
        'printf': 'stdio.h', 'scanf': 'stdio.h', 'puts': 'stdio.h',
        'malloc': 'stdlib.h', 'free': 'stdlib.h', 'atoi': 'stdlib.h',
        'strlen': 'string.h', 'strcpy': 'string.h', 'strcmp': 'string.h',
        'sqrt': 'math.h', 'pow': 'math.h', 'sin': 'math.h', 'cos': 'math.h'
    };
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        
        for (const [func, header] of Object.entries(functionHeaders)) {
            const regex = new RegExp(`\\b${func}\\s*\\(`);
            if (regex.test(line) && !includedHeaders.has(header)) {
                markers.push({
                    severity: monaco.MarkerSeverity.Warning,
                    message: `函数 "${func}" 需要 #include <${header}>`,
                    startLineNumber: lineNum + 1,
                    startColumn: line.search(regex) + 1,
                    endLineNumber: lineNum + 1,
                    endColumn: line.search(regex) + func.length + 1
                });
            }
        }
    }
}

// 注册快捷键
function registerEditorShortcuts() {
    if (!monacoEditor) return;
    
    // Ctrl+Enter 提交代码
    monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function() {
        document.dispatchEvent(new CustomEvent('editor-submit', { 
            detail: { code: monacoEditor.getValue() } 
        }));
    });
    
    // Ctrl+Shift+F 格式化代码
    monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, function() {
        monacoEditor.getAction('editor.action.formatDocument').run();
    });
}

// 获取编辑器内容
function getEditorCode() {
    return monacoEditor ? monacoEditor.getValue() : '';
}

// 设置编辑器内容
function setEditorCode(code) {
    if (monacoEditor) {
        monacoEditor.setValue(code);
    }
}

// 清空编辑器（带确认）
function clearEditor(skipConfirm = false) {
    if (!monacoEditor) return;
    
    const currentCode = monacoEditor.getValue().trim();
    const defaultCode = getDefaultCode(currentLanguage).trim();
    
    // 如果代码已经是默认模板或为空，直接返回
    if (currentCode === defaultCode || currentCode === '') {
        return;
    }
    
    // 需要确认
    if (!skipConfirm) {
        if (!confirm('确定要清空代码吗？此操作不可撤销。')) {
            return;
        }
    }
    
    monacoEditor.setValue(getDefaultCode(currentLanguage));
}

// 切换主题
function toggleEditorTheme() {
    if (!window.monaco || !monacoEditor) return;
    
    const currentTheme = monacoEditor._themeService._theme.themeName;
    const newTheme = currentTheme === 'vs-dark' ? 'vs' : 'vs-dark';
    monaco.editor.setTheme(newTheme);
}

// 销毁编辑器
function disposeEditor() {
    if (monacoEditor) {
        monacoEditor.dispose();
        monacoEditor = null;
    }
}

// 导出函数
window.MonacoEditorManager = {
    init: initMonacoEditor,
    getCode: getEditorCode,
    setCode: setEditorCode,
    clear: clearEditor,
    toggleTheme: toggleEditorTheme,
    dispose: disposeEditor,
    validate: validateCode,
    getEditor: () => monacoEditor,
    switchLanguage: switchLanguage,
    setLanguage: switchLanguage, // 别名
    getCurrentLanguage: getCurrentLanguage,
    getDefaultCode: getDefaultCode,
    layout: () => monacoEditor && monacoEditor.layout()
};
