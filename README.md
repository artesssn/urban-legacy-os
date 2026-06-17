# Urban Legacy

Vitrine propria da Urban Legacy criada do zero em HTML, CSS e JavaScript, com cadastro de cliente e integracao com Supabase para produtos e pedidos.

## Como abrir

Localmente, para testar no seu computador:

```powershell
node server.mjs
```

Acesse:

```text
http://localhost:4173
```

Painel de gestao:

```text
http://localhost:4173/admin.html
```

## Rodar na internet

O Supabase fica responsavel por banco, login, produtos e pedidos. O site precisa ser publicado em uma hospedagem estatica como Vercel ou Netlify.

### Vercel

1. Crie uma conta em `https://vercel.com`.
2. Envie esta pasta para um repositorio no GitHub.
3. Na Vercel, clique em `Add New Project`.
4. Importe o repositorio.
5. Nao precisa configurar build command.
6. Publique.

Depois da publicacao, os links ficam nesse formato:

```text
https://nome-do-projeto.vercel.app
https://nome-do-projeto.vercel.app/admin.html
```

Com `cleanUrls`, tambem pode funcionar:

```text
https://nome-do-projeto.vercel.app/admin
```

## O que tem

- Home, categorias, busca sem diferenciar maiusculas/minusculas e sem depender de acento.
- Pagina de categoria, filtros, ordenacao e detalhe de produto.
- Carrinho e finalizacao pelo WhatsApp `34 98834-5037`.
- Mensagem do WhatsApp destacando o produto pedido.
- Cadastro/login de cliente.
- Produtos carregados do Supabase quando o banco estiver configurado.
- Painel admin com aba de produtos para especificacoes completas.
- Aba de vendas com pedidos, status, metricas e grafico dos ultimos 7 dias.

## Configurar Supabase

1. Abra `supabase-schema.sql`.
2. Rode o SQL no editor SQL do Supabase.
3. Crie ou entre com o usuario admin.
4. No Supabase Auth, copie o ID desse usuario.
5. Rode no SQL editor:

```sql
insert into public.store_admins (user_id)
values ('COLE_AQUI_O_ID_DO_USUARIO_ADMIN');
```

Depois disso, o `admin.html` consegue controlar os produtos e pedidos. Produtos marcados como publicados aparecem automaticamente no site.

## Gestao da loja

No painel `admin.html` existem duas areas:

- `Produtos`: cadastro de nome, categoria, SKU, selo, preco, custo, estoque, tamanhos, material, modelagem, medidas, cuidados, imagens e descricao.
- `Vendas`: pedidos recebidos, status de atendimento, faturamento, receita confirmada, ticket medio, pendencias, produto destaque e grafico de faturamento dos ultimos 7 dias.

## Produto local de reserva

Se o Supabase estiver fora do ar ou o SQL ainda nao tiver sido rodado, o site continua mostrando os produtos locais de reserva dentro de `app.js`.
