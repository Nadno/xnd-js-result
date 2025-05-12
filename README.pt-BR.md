# js-x-result

Uma biblioteca TypeScript moderna para tratamento de resultados e erros de forma elegante e funcional. A biblioteca implementa o padrão Result Monad fornecendo uma alternativa ao tradicional tratamento de exceções.

## Instalação

```bash
npm install js-x-result
```

ou

```bash
yarn add js-x-result
```

Alternativamente, você pode copiar o arquivo [result.ts](src/result.ts) diretamente para o seu projeto. Esta abordagem pode ser útil para pequenos projetos ou quando você precisa fazer modificações específicas na implementação.

> **Recomendação:** Se o seu projeto utiliza outras bibliotecas que também implementam o padrão Result, considere usar diretamente o js-x-result para manter consistência. Da mesma forma, bibliotecas externas que você desenvolve podem incorporar diretamente esta implementação para garantir compatibilidade.

## Conceitos Básicos

A biblioteca `js-x-result` te ajuda a encapsular resultados de operações que podem falhar, permitindo uma manipulação clara e segura de tipos com TypeScript.

> **IMPORTANTE:** Sempre use o tipo `AnyResult<T, E>` como tipo de retorno de funções, nunca retorne a classe `Result` diretamente.

## API Principal

### Criando Resultados

```typescript
import Result, { AnyResult } from 'js-x-result';

// Resultados bem-sucedidos
const successResult = Result.ok(42);
const emptySuccess = Result.ok(); // Usa Result.OK como valor padrão

// Resultados de falha
const errorResult = Result.not(new Error('Algo deu errado'));
```

### Transformação de Valores

```typescript
// Transformando valores bem-sucedidos
const doubled = Result.ok(21).ok(num => num * 2); // Result.ok(42)

// Tratamento de erros
const transformed = Result.not(new Error('Erro original'))
  .not(err => ({ tipo: 'erro_personalizado', mensagem: err.message }));
```

### Encadeamento de operações

```typescript
// Encadeando transformações
function processarDados(input: number): AnyResult<string, Error> {
  return Result.ok(input)
    .ok(num => num * 2)
    .ok(num => {
      if (num > 100) throw new Error('Valor muito alto');
      return num;
    })
    .ok(num => `O resultado é: ${num}`);
}

const resultado = processarDados(30); // Result.ok("O resultado é: 60")
const resultadoErro = processarDados(60); // Result.not(Error("Valor muito alto"))
```

### Extração e Tratamento de Valores

```typescript
// Extraindo valores diretamente
const valor = Result.ok(42).value(); // 42
const valorComTransformacao = Result.ok(42).value(n => n.toString()); // "42"

// Valores padrão para erros
const valorPadrao = Result.not(new Error()).defaultValue(0); // 0

// Tratamento de erros com or()
const valorOuErro = Result.not(new Error('Falhou')).or(err => `Erro: ${err.message}`); // "Erro: Falhou"
```

### Operações Assíncronas

```typescript
// Convertendo Promises em Results
async function buscarDados(id: string): Promise<AnyResult<any, Error>> {
  const promise = fetch(`https://api.example.com/data/${id}`).then(r => r.json());
  return Result.resolve(promise);
}

// Tratando operações assíncronas com try/catch funcional
async function operacaoSegura(): Promise<AnyResult<string, Error>> {
  return await Result.tryCatchAsync(async () => {
    const resposta = await fetch('https://api.example.com/data');
    if (!resposta.ok) throw new Error(`HTTP Error: ${resposta.status}`);
    const dados = await resposta.json();
    return dados.mensagem;
  });
}
```

## Casos de Uso Comuns

### Validação de Formulários

```typescript
function validarFormulario(form: any): AnyResult<any, {campo: string, mensagem: string}> {
  if (!form.username || form.username.length < 3) {
    return Result.not({
      campo: 'username',
      mensagem: 'Nome de usuário deve ter pelo menos 3 caracteres'
    });
  }

  if (!form.email.includes('@')) {
    return Result.not({
      campo: 'email',
      mensagem: 'Email inválido'
    });
  }

  return Result.ok(form);
}
```

### Processamento de Arquivos

```typescript
function processarArquivo(nomeArquivo: string): AnyResult<any, {codigo: string, mensagem: string}> {
  if (!nomeArquivo.endsWith('.jpg') && !nomeArquivo.endsWith('.png')) {
    return Result.not({
      codigo: 'formato_invalido',
      mensagem: 'Formato de arquivo não suportado'
    });
  }

  return Result.ok({
    nome: nomeArquivo,
    tipo: nomeArquivo.endsWith('.jpg') ? 'image/jpeg' : 'image/png'
  })
    .ok(metadata => ({
      ...metadata,
      processado: true
    }));
}
```

### Operações de API

```typescript
async function buscarUsuario(id: string): Promise<AnyResult<any, any>> {
  return await Result.tryCatchAsync(async () => {
    const resposta = await fetch(`https://api.example.com/users/${id}`);
    if (!resposta.ok) throw new Error(`HTTP Error: ${resposta.status}`);
    
    const usuario = await resposta.json();
    
    return {
      nome: usuario.name,
      email: usuario.email,
      admin: usuario.role === 'admin'
    };
  })
  .not(erro => ({
    codigo: 'erro_api',
    mensagem: erro.message,
    recuperavel: true
  }));
}
```

## Boas Práticas

1. **Use `AnyResult<T, E>` como tipo de retorno** em vez da classe `Result` diretamente.
2. **Mantenha a consistência** nos tipos de erro em toda a sua aplicação.
3. **Aproveite o encadeamento** de métodos para transformações claras e legíveis.
4. **Prefira tratamento de erros explícito** em vez de confiar em exceções.
5. **Use `defaultValue()` ou `or()`** para lidar com casos de falha no final da cadeia de processamento.

## Exemplos Completos

A biblioteca inclui vários exemplos práticos que demonstram casos de uso potenciais:

> **Nota:** Os exemplos a seguir foram gerados por IA com o foco principal na validação da tipagem do TypeScript. Eles servem como demonstração conceitual das capacidades da biblioteca, não necessariamente como implementações reais recomendadas.

- [APIs e Requisições HTTP](src/__examples__/api.examples.ts) - Tratamento de respostas de API
- [Autenticação](src/__examples__/authentication.examples.ts) - Fluxos de autenticação e autorização
- [Lógica de Negócios](src/__examples__/business-logic.examples.ts) - Implementação de regras de negócio
- [Estratégias de Cache](src/__examples__/cache-strategies.examples.ts) - Gerenciamento de cache com tratamento de erro
- [Processamento de Dados](src/__examples__/data-processing.examples.ts) - Transformação e validação de dados
- [Operações com Arquivos](src/__examples__/file-operations.examples.ts) - Leitura, escrita e processamento de arquivos
- [Validação de Formulários](src/__examples__/form-validation.examples.ts) - Validação e processamento de entradas
- [Cliente HTTP](src/__examples__/http-client.examples.ts) - Wrapper para requisições HTTP
- [Exemplos Gerais](src/__examples__/general.examples.ts) - Casos de uso diversos e utilidades

Estes exemplos ilustram as possibilidades de tipagem e são úteis para entender como a biblioteca lida com diferentes cenários de erro.

## Contribuições

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request para sugerir alterações ou melhorias.

## Uso Com Outras Bibliotecas

Quando você estiver desenvolvendo bibliotecas ou componentes que serão utilizados por outros projetos, considere:

1. **Retornar `AnyResult`** para manter a consistência com o padrão Result
2. **Exportar a dependência do js-x-result** para que os consumidores da sua biblioteca possam utilizá-la sem conflitos de implementação
3. **Documentar claramente** que sua biblioteca depende da implementação do js-x-result

Isso facilita a integração com outras ferramentas e mantém um padrão consistente de tratamento de erros em todo o ecossistema.

## Licença

MIT
