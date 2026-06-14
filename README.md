# Urban Legacy OS

App para controle de estoque, vendas, clientes, relatórios e precificação de revenda da Urban Legacy.

Ele funciona de dois jeitos:

- **Modo local:** salva os dados no navegador.
- **Modo nuvem:** salva os dados no Supabase, funcionando no celular mesmo com o computador desligado.

## Como abrir

Na pasta do projeto, rode:

```powershell
node server.mjs
```

Depois acesse:

```text
http://localhost:4173
```

Os dados ficam salvos no navegador usando `localStorage`. Para repor os dados de exemplo, clique no botão com ícone de brilho no topo.

## Como deixar online grátis

### 1. Criar banco no Supabase

1. Crie uma conta em `https://supabase.com`.
2. Crie um novo projeto.
3. Entre em **SQL Editor**.
4. Copie o conteúdo de `supabase-schema.sql`.
5. Execute o SQL.

Esse script cria as tabelas:

- `products`
- `sales`
- `customers`

E também ativa regras de segurança por usuário.

### 2. Pegar as chaves do Supabase

No Supabase, vá em:

```text
Project Settings > API
```

Copie:

- `Project URL`
- `anon public key`

Depois edite o arquivo `supabase-config.js`:

```js
window.URBAN_LEGACY_SUPABASE = {
  url: "COLE_A_PROJECT_URL_AQUI",
  anonKey: "COLE_A_ANON_PUBLIC_KEY_AQUI"
};
```

### 3. Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie estes arquivos para o repositório.
3. Vá em **Settings > Pages**.
4. Em **Build and deployment**, selecione:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

Depois o GitHub vai gerar um link parecido com:

```text
https://seu-usuario.github.io/urban-legacy-os/
```

Esse link abre no celular sem depender do computador ligado.

### 4. Primeiro acesso

Abra o app online, crie seu acesso com e-mail e senha, depois entre.

Se o Supabase pedir confirmação por e-mail, confirme primeiro e depois faça login no app.

## Módulos

- Painel com faturamento, lucro, estoque e ticket médio.
- Cadastro e edição de produtos com SKU, categoria, custo, preço e estoque mínimo.
- Calculadora de preço sugerido com custo, frete, embalagem, taxas, desconto, comissão e margem.
- Registro de vendas com baixa automática de estoque.
- Cadastro de clientes.
- Relatórios e recomendações operacionais.

## Observação importante

O arquivo `supabase-config.js` usa a chave pública `anon`, que é normal em apps web. A segurança real fica nas regras do `supabase-schema.sql`, que limitam os dados ao usuário logado.
