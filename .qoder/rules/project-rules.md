---
trigger: always_on
---

- 遵循 AGENTS.md 里的说明
- 遵循所有 ESLint 告警，每次修改完后都要检查并修复问题
- 尽量不用 class
- 能用 type 就不用 interface
- UI 和功能代码尽量分离
- 同一个功能的代码尽量放到同一个文件中，除非需要在别的文件中复用
- 只有一个地方使用的类、函数、常量、变量、类型等放在使用它们的文件中，不要放到别的地方
- 使用智谱 (bigmodel.cn) API 时，参考官方文档: https://docs.bigmodel.cn/llms.txt
