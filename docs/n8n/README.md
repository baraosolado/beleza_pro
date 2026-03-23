# Workflows n8n — Beleza Pro

## Consórcio — sorteio + vídeo + envio WhatsApp (dois webhooks)

### Visão geral

1. **`N8N_CONSORCIO_DRAW_WEBHOOK_URL`** — O SaaS **não** sorteia no servidor. Ao clicar em “Disparar sorteio agora”, o backend chama este webhook com a lista de **participantes elegíveis** (`participantesElegiveis`). O n8n deve:
   - sortear (ou chamar **sua API** para registrar o sorteio),
   - gerar o vídeo curto,
   - responder na mesma requisição HTTP com a **ganhadora pelo nome completo** (igual ao campo `nome` enviado) e o vídeo (`videoUrl` e/ou `videoBase64`).

2. **`N8N_CONSORCIO_SEND_WEBHOOK_URL`** — Depois que a usuária **revê o vídeo** no SaaS e confirma, o backend chama este webhook com `sorteioId`, dados da ganhadora e o vídeo (URL + base64 ainda disponível no payload) para **enviar ao WhatsApp** (grupo/canal que você configurar no n8n).

### Evento do 1º webhook (corpo JSON)

- `evento`: `"consorcio_sorteio_solicitacao"`
- `participantesElegiveis`: `[{ participanteId, clienteId, nome, telefone }, ...]` — a ganhadora deve ser uma dessas `nome` (nome completo).
- `participantesTodas`, `salao`, `ciclo`, `totais`, `disparadoPor`, `saas.appUrl`, `saas.apiPublicUrl` (úteis se o n8n for chamar APIs externas).
- `revistasSelecionadas` (opcional, legado): só aparece se ainda houver IDs salvos no banco de versões antigas. **A escolha de revistas para WhatsApp é no modal “Sorteio concluído”** e vai no 2º webhook em `revistasParaEnviar`.

### Resposta do 1º webhook (obrigatório para concluir no SaaS)

| Campo | Descrição |
|--------|-----------|
| **`ganhadoraNome`** (ou `winnerName`, `ganhadora`) | Nome da ganhadora. O SaaS tenta: **igual** ao cadastro; ou cadastro começa com esse texto + espaço (ex.: n8n manda `Mirian` e no cadastro é `Mirian Silva`); ou **primeiro nome único** entre as elegíveis. Se houver ambiguidade, retorna erro. |
| **`videoUrl`** | Opcional. Link do vídeo. |
| **`videoBase64`** / **`gif_base64`** | Opcional. Base64 puro ou data URL (`data:video/mp4;base64,...`, `data:image/gif;base64,...`). **GIF** é suportado; a UI usa `<img>`, não `<video>`. Limite ~14M caracteres. |
| **`videoMimeType`** | Opcional; senão inferido do prefixo base64 ou do data URL. Use `image/gif` para GIF. |
| **`success`**, **`message`** | Opcionais. |

Exemplo:

```json
{
  "success": true,
  "ganhadoraNome": "Maria Silva Santos",
  "videoBase64": "AAAA...",
  "videoMimeType": "video/mp4",
  "message": "Sorteio e render concluídos."
}
```

### Evento do 2º webhook (envio)

- `evento`: `"consorcio_sorteio_enviar"`
- `sorteioId`, `ganhadora` (`nome`, `telefone`, `participanteId`, `clienteId`), `salao`, `ciclo`
- `video`: `{ videoUrl, videoBase64, videoMimeType }` — o base64 pode vir preenchido se o preview foi guardado no banco; após sucesso o SaaS remove o preview em base64.
- **`revistasParaEnviar`** (opcional): array enviado quando a usuária marca revistas no modal **Sorteio concluído** e clica em **Enviar vídeo e revistas no WhatsApp**. Cada item segue o mesmo formato de `revistasSelecionadas` do 1º webhook: `pdfId`, `docName`, **`file`** (URL pública do PDF), `text`, `mime`, e `pdfBase64` só em legado.

Resposta sugerida: `{ "success": true, "whatsappSent": true, "message": "..." }`.

### Importar workflow de exemplo

1. n8n → **Import from File** → `consorcio-sorteio.workflow.json`
2. Ative o workflow.
3. Copie a URL **Production** do Webhook.
4. `.env` na API: `N8N_CONSORCIO_DRAW_WEBHOOK_URL` e `N8N_CONSORCIO_SEND_WEBHOOK_URL`.

### Estender

Insira nós entre o Webhook e o **Respond to Webhook** para sua API própria, render de vídeo, Evolution/uazapi, etc. Garanta que a resposta ao SaaS inclua **`ganhadoraNome`** correto.

---

## Consórcio — upload de revista (PDF → MinIO / URL pública)

Variável na API: **`N8N_CONSORCIO_PDF_UPLOAD_WEBHOOK_URL`**.

Quando a usuária envia um PDF em **Revistas**, a API **não** grava o arquivo no Postgres: chama este webhook; o n8n deve subir para o MinIO (ou S3), gerar URL pública e responder na mesma requisição.

### Formato preferido: `multipart/form-data` (PDFs grandes, ex. 30MB+)

O painel envia **`multipart/form-data`** com:

| Campo | Descrição |
|--------|-----------|
| `file` | Arquivo binário do PDF |
| `evento` | `"consorcio_revista_upload"` |
| `usuarioId` | UUID da usuária (tenant) |
| `titulo` | Título da revista no SaaS |
| `nomeArquivo` | Nome original (string; pode ser vazio) |
| `mime` | Ex.: `application/pdf` |
| `categoria` | Opcional |
| `mesReferencia` | Opcional |

No n8n, configure o nó **Webhook** para aceitar **Form Data** / **Multipart** e use o binário de `file` no MinIO/S3 (não espere mais só JSON com base64).

### “Só aparece JSON” e o PDF some na execução

1. **Modo do Webhook**  
   No nó **Webhook**, o corpo **não** pode estar como “só JSON”. Use opção equivalente a **Form Data** / **Multipart** (conforme sua versão do n8n), para o n8n popular **`$binary`** / aba **Binary** na execução.

2. **Onde ver o arquivo**  
   Na execução, os campos de texto (`evento`, `usuarioId`, `titulo`…) aparecem no painel em JSON. O PDF **não** fica nesse JSON: fica em **Binary** (ex.: propriedade `file` ou o nome do campo que você mapeou). O próximo nó (MinIO, S3, Write Binary File) deve ler **`$binary.file`** (ou o nome do campo), não só `{{ $json }}`.

3. **API → n8n**  
   O backend envia multipart com o pacote **`form-data`** via **`http(s).request` + `form.pipe(req)`** (não `fetch` com stream do `form-data`: isso pode gerar **Content-Length ~17** e `body: {}` no webhook).

### Legado: corpo JSON (POST)

Ainda suportado para integrações antigas; **não** é o que o frontend usa hoje (PDF grande em base64 no JSON costuma estourar proxy/memória).

| Campo | Descrição |
|--------|-----------|
| `evento` | `"consorcio_revista_upload"` |
| `usuarioId` | UUID da usuária (tenant) |
| `titulo` | Título da revista no SaaS |
| `categoria` | Opcional — preenchido no modal |
| `mesReferencia` | Opcional — mês de referência do modal |
| `nomeArquivo` | Nome original do arquivo ou `null` |
| `mime` | Ex.: `application/pdf` |
| `pdfBase64` | Base64 **puro** (sem prefixo `data:`) |

### Resposta (obrigatório)

Devolva **HTTP 200** e um JSON com **pelo menos uma** URL pública em um destes campos (raiz ou dentro de `json`):

`publicUrl`, `pdfUrl`, `file`, `url`, `link`, `minioUrl` (aceitos também com snake_case).

Exemplo:

```json
{
  "success": true,
  "pdfUrl": "https://seu-minio/revistas/natura.pdf"
}
```

**Importante — `pdfUrl` não pode ser texto com `{{ ... }}`**

Se a resposta vier assim, o SaaS **rejeita** (não é URL válida):

```json
{
  "pdfUrl": "{{ $item(\"0\").$node[\"Edit Fields\"].json[\"url\"] }}"
}
```

Isso significa que no nó **Respond to Webhook** o campo foi preenchido como **texto fixo** em vez de **expressão**.

- Clique no campo `pdfUrl` (ou equivalente) e ative o modo **Expression** (ícone **=** / “Expression”).
- A expressão deve aparecer **sem aspas** no editor de expressões; o n8n avalia e o HTTP envia só a string `https://...`.
- Alternativa: use um nó **Set** / **Code** antes, grave a URL em `json.url`, e no Respond use expressão `{{ $json.url }}` já avaliada, ou “Respond With: First Incoming Item” mapeando o campo certo.

O que o SaaS precisa receber no corpo HTTP é literalmente: `"pdfUrl": "https://s3....pdf"`.

### Se aparecer 502 no SaaS ou “não chega no webhook”

1. **URL do webhook**  
   Use a URL **Production** do nó Webhook no n8n. A URL de **Test** só recebe quando você clica em “Listen for test event” no editor — o SaaS chama do servidor e **não** dispara o modo teste.

2. **Onde a API chama**  
   Quem faz `POST` é o **processo Node da API** (`localhost:3001` ou seu deploy). Se no `.env` estiver `http://localhost:5678/...`, isso só funciona se o n8n estiver **na mesma máquina** que a API. Se a API estiver em Docker/servidor, use host acessível por ela (IP, `host.docker.internal`, domínio público).

3. **Resposta obrigatória**  
   O fluxo precisa terminar com **HTTP 200** e corpo **JSON** contendo uma URL (`pdfUrl`, `file`, etc.). Se o n8n responder 200 com HTML ou sem JSON, o SaaS devolve erro (antes parecia só “502” genérico).

4. **Logs da API**  
   No terminal da API procure linhas `[consorcio-pdf-upload]` — mostram host chamado, falha de rede, timeout ou “sem URL” na resposta.

### Revista → qualquer cliente (menu **Clientes**)

Variável na API: **`N8N_CONSORCIO_REVISTA_CLIENT_WEBHOOK_URL`**.

No painel **Revistas** → **Enviar**, a opção **“Qualquer cliente (cadastro Clientes)”** faz `POST` JSON para esse webhook (a pessoa **não** precisa estar no consórcio).

- `evento`: `"consorcio_revista_enviar_cliente"`
- `disparadoEm`, `usuarioId`
- `salao`: `nomeUsuario`, `emailUsuario`, `nomeNegocio`, `telefoneNegocio`
- `cliente`: `clienteId`, `nome`, `telefone`
- `pdf`: `pdfId`, `titulo`, `nomeArquivo`, `file` (URL pública ou `null`), `mime`, `pdfBase64` (só legado)
- `legenda`: texto tipo `Revista: …`

Responda **HTTP 2xx**. Em sucesso o SaaS registra linha no histórico de envios (WhatsApp).

### Revistas no WhatsApp

Use o 2º webhook (`consorcio_sorteio_enviar`) e o campo **`revistasParaEnviar`** (marcado no modal após o sorteio). O 1º webhook pode ainda enviar `revistasSelecionadas` apenas por dados legados no banco; ao **Salvar** nas configurações do ciclo, o SaaS zera essa lista no servidor.
