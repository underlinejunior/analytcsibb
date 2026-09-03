# Dashboard YouTube da Igreja — HTML/CSS/JS + Google Apps Script

Esta versão foi feita para ser simples:

- **Frontend:** HTML + CSS + JavaScript puro.
- **Hospedagem:** GitHub Pages (ou qualquer hospedagem estática).
- **Dados privados do YouTube:** Google Apps Script.
- **Sem VPS, sem Node.js, sem banco, sem `.env`, sem tela de login.**
- Depois de configurado: **abriu a página → visualizou o dashboard**.

## Estrutura

```text
dashboard-youtube-appsscript/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── config.js          ← cole aqui a URL /exec do Apps Script
│   ├── api.js
│   ├── app.js
│   ├── graficos.js
│   └── dados-demo.js
└── apps-script/
    ├── Code.gs            ← backend Google
    └── appsscript.json
```

---

# Configuração rápida

## 1. Criar o Google Apps Script

Use **uma conta Google que tenha acesso ao canal da igreja**.

> Se você quiser usar uma conta técnica diferente da conta principal da igreja, adicione essa conta como administradora/gerente do canal antes.

1. Acesse `script.google.com`.
2. Crie um **Novo projeto**.
3. Apague o conteúdo do `Code.gs`.
4. Copie todo o conteúdo de `apps-script/Code.gs` deste projeto e cole lá.

### Ativar os dois serviços do YouTube

No editor do Apps Script:

1. Na lateral esquerda, em **Serviços**, clique em `+`.
2. Adicione **YouTube Data API v3** / **YouTube**.
3. Clique novamente em `+`.
4. Adicione **YouTube Analytics API v2** / **YouTube Analytics**.

O projeto já inclui `appsscript.json` como referência, mas adicionar os serviços pela interface é a forma mais simples.

## 2. Autorizar uma única vez

No seletor de funções do Apps Script:

1. Escolha a função `autorizar`.
2. Clique em **Executar**.
3. O Google pedirá autorização.
4. Autorize usando a conta que tem acesso ao canal.

Depois abra **Registro de execução**. Deve aparecer algo parecido com:

```text
Canal autorizado: Nome do Canal (UC...)
```

Se aparecer o canal certo, pronto.

### Se a conta tiver mais de um canal

Abra o início de `Code.gs` e preencha:

```javascript
CHANNEL_ID: 'UCxxxxxxxxxxxxxxxx'
```

Depois execute `autorizar` novamente.

## 3. Publicar o Apps Script

No canto superior direito:

1. **Implantar** → **Nova implantação**.
2. Tipo: **Aplicativo da Web**.
3. **Executar como:** `Eu`.
4. **Quem pode acessar:** `Qualquer pessoa`.
5. Clique em **Implantar**.
6. Copie a URL que termina em `/exec`.

Exemplo:

```text
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec
```

Não use a URL `/dev`.

## 4. Colar a URL no dashboard

Abra:

```text
js/config.js
```

Troque:

```javascript
APPS_SCRIPT_URL: "COLE_AQUI_A_URL_DO_APPS_SCRIPT"
```

por:

```javascript
APPS_SCRIPT_URL: "https://script.google.com/macros/s/SEU_ID/exec"
```

Salve.

## 5. Colocar no GitHub Pages

Envie para um repositório do GitHub apenas:

```text
index.html
css/
js/
```

A pasta `apps-script/` é só para configuração do Google e não precisa ficar publicada.

No GitHub:

1. **Settings**.
2. **Pages**.
3. **Deploy from a branch**.
4. Escolha `main` e `/root`.
5. Salve.

Depois o endereço ficará parecido com:

```text
https://usuario.github.io/dashboard-youtube/
```

Se quiser, depois pode apontar um subdomínio como:

```text
analytics.ibbparnaiba.com.br
```

---

# O que o dashboard consulta

## YouTube Data API v3

Usada para identificar:

- canal;
- vídeos enviados;
- transmissões ao vivo concluídas;
- título do culto;
- thumbnail;
- data real da transmissão.

## YouTube Analytics API v2

Usada para:

- visualizações;
- horas assistidas;
- duração média;
- inscritos conquistados;
- evolução por dia/mês;
- sexo;
- faixa etária;
- cidades;
- dispositivos;
- tempo médio por dispositivo;
- inscritos x não inscritos;
- fontes de tráfego;
- retenção por culto;
- média e pico de espectadores simultâneos.

## YouTube Reporting API

Não é necessária para a primeira versão do painel.

A Reporting API é mais indicada para **relatórios em massa e históricos armazenados**, enquanto a Analytics API é indicada para consultas segmentadas em tempo real, que é exatamente o funcionamento deste dashboard.

Se futuramente quisermos manter uma base histórica própria, aí podemos acrescentar a Reporting API sem mudar o frontend.

---

# Como o acesso direto funciona

Depois de configurado:

```text
Pastor abre o endereço
        ↓
HTML/CSS/JS carrega
        ↓
consulta o Web App do Apps Script
        ↓
Apps Script executa como a conta autorizada
        ↓
consulta YouTube Data + Analytics
        ↓
dashboard aparece
```

O visitante **não faz login no Google** e não recebe nenhum token da conta da igreja.

## Importante sobre privacidade

A implantação foi pensada para o requisito “abriu → visualizou”. Portanto, o endpoint do Apps Script é público e retorna apenas os dados que o próprio dashboard exibe.

Não coloque senhas, tokens, e-mails privados ou outras informações sensíveis dentro das respostas do `Code.gs`.

---

# Cache

O Apps Script guarda o dashboard em cache por 10 minutos e os detalhes de cada culto por 30 minutos.

Isso deixa a página mais rápida e reduz chamadas às APIs do YouTube.

Para forçar atualização, execute a função:

```javascript
limparCache()
```

no editor do Apps Script, ou aguarde a expiração automática.

---

# Filtrar somente cultos pelo título

Por padrão, o sistema considera **todas as transmissões ao vivo concluídas** como possíveis cultos.

Se o canal também faz lives de eventos que não devem entrar no ranking, altere em `Code.gs`:

```javascript
FILTER_BY_TITLE: true
```

E ajuste:

```javascript
CULT_KEYWORDS: ['culto', 'celebração', 'ceia', 'oração']
```

---

# Modo demonstração

Se `js/config.js` ainda não tiver a URL correta do Apps Script, o dashboard continua abrindo com dados demonstrativos. Isso permite testar o layout antes de conectar o canal real.
