Evolution GO Documentation
﻿

Authorization
API Key
Key
apikey
Value
{{token}}
Instance
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
POST
Create Instance
{{host}}/instance/create
﻿

Authorization
API Key
Key
apikey
Value
{{adminToken}}
Body
raw (json)
json
{
    "instanceId": "{{instance}}", // opicional
    "name": "teste",
    "token": "2ef79c34-b6e1-4969-9e37-12b3d3a9d1014"
    // "proxy": {
    //     "host": ""
    // }
}
GET
Fetch All Instances
{{host}}/instance/all
﻿

Authorization
API Key
Key
apikey
Value
{{adminToken}}
GET
Fetch Instance
{{host}}/instance/info/:instanceId
﻿

Authorization
API Key
Key
apikey
Value
{{adminToken}}
Path Variables
instanceId
{{instance}}
GET
Get logs
{{host}}/instance/logs/:instanceId?start_date=2025-04-11&end_date=2025-04-17&level=DEBUG,WARN,ERROR,INFO&limit=50
﻿

Authorization
API Key
Key
apikey
Value
{{adminToken}}
Query Params
start_date
2025-04-11
YYYY-MM-DD

end_date
2025-04-17
YYYY-MM-DD

level
DEBUG,WARN,ERROR,INFO
DEBUG,WARN,ERROR,INFO

limit
50
Path Variables
instanceId
{{instance}}
DELETE
Delete Instance
{{host}}/instance/delete/:instanceId
﻿

Authorization
API Key
Key
apikey
Value
{{adminToken}}
Path Variables
instanceId
{{instance}}
DELETE
Delete Proxy
{{host}}/instance/proxy/:instanceId
﻿

Authorization
API Key
Key
apikey
Value
{{adminToken}}
Path Variables
instanceId
{{instance}}
POST
Instance Connect
{{host}}/instance/connect
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
View More
json
{
    "subscribe": [
        // "MESSAGE",
        // "READ_RECEIPT",
        // "PRESENCE",
        // "HISTORY_SYNC",
        // "CHAT_PRESENCE",
        // "CALL",
        // "CONNECTION",
        // "QRCODE",
        // "LABEL",
        // "CONTACT",
        // "GROUP",
        // "NEWSLETTER"
        "ALL"
    ],
    // "websocketEnable": "disabled",
    // "rabbitmqEnable": "enabled",
    // "natsEnable": "disabled",
    "webhookUrl": "https://originators-api-dev.bizpik.com.br/api/evogo/webhook"
}
GET
Get Status
{{host}}/instance/status
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
GET
Get QR
{{host}}/instance/qr
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
POST
Pairing Code
{{host}}/instance/pair
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "phone": "+5511918798714"
}
POST
Disconnect
{{host}}/instance/disconnect
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
POST
Reconnect
{{host}}/instance/reconnect
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
DELETE
Logout
{{host}}/instance/logout
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
POST
Force Reconnect
{{host}}/instance/forcereconnect/:instanceId
﻿

Authorization
API Key
Key
apikey
Value
{{adminToken}}
Path Variables
instanceId
{{instance}}
GET
Get Advanced Settings
{{host}}/instance/:instanceId/advanced-settings
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Path Variables
instanceId
{{instance}}
PUT
Update Advanced Settings
{{host}}/instance/:instanceId/advanced-settings
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Path Variables
instanceId
{{instance}}
Body
raw (json)
json
{
    "rejectCalls": false,
    "rejectCallMessage": "",
    "readMessages": false,
    "readStatus": false,
    "alwaysOnline": false
}
Send Message
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
POST
Send Text
{{host}}/send/text
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "number": "5511999999999",
    "text": "mensagem de teste",
    "delay": 1000
    // "mentionedJid": "557499879409@s.whatsapp.net",
    // "mentionAll": true
    // "quoted": {
    //     "messageId": "3EB00E86C964FE604AF39A",
    //     "participant": "557499879409@s.whatsapp.net"
    // }
}
POST
Send Link
{{host}}/send/link
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "number": "5511999999999",
    "text": "mensagem de teste https://agenciadgcode.com",
    "delay": 1000
    // "mentionedJid": "557499879409@s.whatsapp.net",
    // "mentionAll": true
    // "quoted": {
    //     "messageId": "3EB00E86C964FE604AF39A",
    //     "participant": "557499879409@s.whatsapp.net"
    // }
}
POST
Send Media URL
{{host}}/send/media
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
View More
json
{
    "number": "5511999999999",
    // O campo "url" aceita URL HTTP(S) OU mídia em base64 (sem prefixo data:).
    // Se não começar com http:// ou https://, é decodificado como base64.
    "url": "https://evolution-api.com/files/evolution-api.pdf",
    // Exemplo base64:
    // "url": "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwv...",
    "caption": "teste de mensagem",
    "filename": "arquivo.pdf",
    "type": "document",
    "delay": 1000
    // "mentionedJid": "557499879409@s.whatsapp.net",
    // "mentionAll": true
    // "quoted": {
    //     "messageId": "3EB00E86C964FE604AF39A",
    //     "participant": "557499879409@s.whatsapp.net"
    // }
}
POST
Send Poll
{{host}}/send/poll
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
View More
json
{
    "number": "5511999999999",
    "question": "teste de mensagem",
    "maxAnswer": 4,
    "options": [
        "option1",
        "option2"
    ],
    "delay": 1000
    // "mentionedJid": "557499879409@s.whatsapp.net",
    // "mentionAll": true
    // "quoted": {
    //     "messageId": "3EB00E86C964FE604AF39A",
    //     "participant": "557499879409@s.whatsapp.net"
    // }
}
POST
Send Sticker
{{host}}/send/sticker
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "number": "5511999999999",
    "sticker": "https://evolution-api.com/files/sticker.png",
    "delay": 1000
    // "mentionedJid": "557499879409@s.whatsapp.net",
    // "mentionAll": true
    // "quoted": {
    //     "messageId": "3EB00E86C964FE604AF39A",
    //     "participant": "557499879409@s.whatsapp.net"
    // }
}
POST
Send Location
{{host}}/send/location
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
View More
json
{
    "number": "5511999999999",
    "name": "Bora Bora",
    "address": "French Polynesian",
    "latitude": -16.505538233564373,
    "longitude": -151.7422770494996,
    "delay": 1000
    // "mentionedJid": "557499879409@s.whatsapp.net",
    // "mentionAll": true
    // "quoted": {
    //     "messageId": "3EB00E86C964FE604AF39A",
    //     "participant": "557499879409@s.whatsapp.net"
    // }
}
POST
Send Contact
{{host}}/send/contact
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
View More
json
{
    "number": "5511999999999",
    "vcard": {
        "fullName": "Davidson Gomes",
        "organization": "AtendAI",
        "phone": "5511999999999"
    },
    "delay": 1000
    // "mentionedJid": "557499879409@s.whatsapp.net",
    // "mentionAll": true
    // "quoted": {
    //     "messageId": "3EB00E86C964FE604AF39A",
    //     "participant": "557499879409@s.whatsapp.net"
    // }
}
POST
Send Button
{{host}}/send/button
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
View More
json
{
    "number": "5511999999999",
    "title": "Whatsmeow",
    "description": "botão pela whatsmeow",
    "footer": "Clique nos botões",
    "buttons": [
        {
            "type": "pix",
            "currency": "BRL",
            "name": "Davidson Gomes",
            "keyType": "random", /* phone, email, cpf, cnpj, random  */
            "key": "0ea59ac5-f001-4f0e-9785-c772200f1b1e"
        }
        // {
        //     "type": "reply",
        //     "displayText": "Resposta 1",
        //     "id": "1"
        // },
        // {
        //     "type": "reply",
        //     "displayText": "Resposta 2",
        //     "id": "2"
        // },
        // {
        //     "type": "copy",
        //     "displayText": "Copia Código",
        //     "copyCode": "ZXN0ZSDDqSB1bSBjw7NkaWdvIGRlIHRleHRvIGNvcGnDoXZlbC4="
        // },
        // {
        //     "type": "url",
        //     "displayText": "Evolution API",
        //     "url": "http://evolution-api.com"
        // },
        // {
        //     "type": "call",
        //     "displayText": "Me ligue",
        //     "phoneNumber": "557499879409"
        // }
    ],
    "delay": 1000
    // "mentionedJid": "557499879409@s.whatsapp.net",
    // "mentionAll": true
    // "quoted": {
    //     "messageId": "3EB00E86C964FE604AF39A",
    //     "participant": "557499879409@s.whatsapp.net"
    // }
}
POST
Send List
{{host}}/send/list
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
View More
json
{
    "number": "5511999999999",
    "title": "List Title",
    "description": "List description",
    "buttonText": "Click Here",
    "footerText": "footer list",
    "sections": [
        {
            "title": "Row tilte 01",
            "rows": [
                {
                    "title": "Title row 01",
                    "description": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
                    "rowId": "rowId 001"
                },
                {
                    "title": "Title row 02",
                    "description": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
                    "rowId": "rowId 002"
                }
            ]
        },
        {
            "title": "Row tilte 02",
            "rows": [
                {
                    "title": "Title row 01",
                    "description": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
                    "rowId": "rowId 001"
                },
                {
                    "title": "Title row 02",
                    "description": "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
                    "rowId": "rowId 002"
                }
            ]
        }
    ],
    "delay": 1000
    // "mentionedJid": "557499879409@s.whatsapp.net",
    // "mentionAll": true
    // "quoted": {
    //     "messageId": "3EB00E86C964FE604AF39A",
    //     "participant": "557499879409@s.whatsapp.net"
    // }
}
POST
Send Carousel
{{host}}/send/carousel
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
View More
json
{
    "number": "5511999999999",
    "text": "Confira nossos produtos",
    "cards": [
        {
            "image": "https://evolution-api.com/files/card1.jpg",
            "text": "Produto 1",
            "footer": "Oferta exclusiva",
            "buttons": [
                {
                    "type": "reply",
                    "displayText": "Quero saber mais",
                    "id": "card1_reply"
                },
                {
                    "type": "url",
                    "displayText": "Ver site",
                    "url": "https://evolution-api.com"
                }
            ]
        },
        {
            "image": "https://evolution-api.com/files/card2.jpg",
            "text": "Produto 2",
            "footer": "Promoção",
            "buttons": [
                {
                    "type": "reply",
                    "displayText": "Comprar",
                    "id": "card2_buy"
                }
            ]
        }
    ],
    "delay": 1000
}
User
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
POST
User Info
{{host}}/user/info
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "number": [
        "5511999999999"
    ]
}
POST
Check User
{{host}}/user/check
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "number": [
        "5511999999999"
    ]
}
POST
Get Avatar
{{host}}/user/avatar
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "number": "5511999999999",
    "preview": false
}
GET
Get Contacts
{{host}}/user/contacts
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
GET
Get Privacy Settings
{{host}}/user/privacy
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
POST
Block Contact
{{host}}/user/block
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "number": "5511999999999"
}
POST
UnBlock Contact
{{host}}/user/unblock
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "number": "5511999999999"
}
GET
Block List
{{host}}/user/blocklist
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
POST
Set Profile Picture
{{host}}/user/profilePicture
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
View More
json
{
    "image": "https://i.etsystatic.com/43909860/r/il/6ae03d/5002111235/il_570xN.5002111235_foat.jpg"
}
POST
Set Profile Name
{{host}}/user/profileName
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "name": "Davidson Gomes"
}
POST
Set Profile Status
{{host}}/user/profileStatus
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "status": "Disponível"
}
Message
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
POST
React a Message
{{host}}/message/react
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "number": "5511999999999",
    "id": "3EB08443D6D1D27E1D48B1",
    "reaction": "🔥"
}
POST
Send Presence
{{host}}/message/presence
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "number": "5511999999999",
    "state": "composing", /* composing, paused */
    "isAudio": true
}
POST
Mark as Read
{{host}}/message/markread
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "number": "5511999999999",
    "id": ["3EB00921B31193E2DB2370", "3EB08712BD584101105EC9"]
}
POST
Download Media
{{host}}/message/downloadmedia
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
View More
json
{
    "message": {
        "imageMessage": {
            "URL": "https://mmg.whatsapp.net/o1/v/t62.7118-24/f1/m232/up-oil-image-ab662828-556a-4b8f-bfff-394223de6535?ccb=9-4&oh=01_Q5AaIGK4LtTcfqHxYiyr2lgN4Suzsorlule_mQFBemcVhBty&oe=673773A1&_nc_sid=e6ed6c&mms3=true",
            "directPath": "/o1/v/t62.7118-24/f1/m232/up-oil-image-ab662828-556a-4b8f-bfff-394223de6535?ccb=9-4&oh=01_Q5AaIGK4LtTcfqHxYiyr2lgN4Suzsorlule_mQFBemcVhBty&oe=673773A1&_nc_sid=e6ed6c",
            "mediaKey": "wbFx7x7ou9z3BKjCN8lmf66FqfCivT6uzRln+epd1yk=",
            "mimetype": "image/jpeg",
            "fileEncSHA256": "PBHUgEC4XUQHO99lxQjMRvu6xLHyilVTzXu1T8PiM+E=",
            "fileSHA256": "1QUQbJE44Xr4PiirRREsp6fa9RY8vjVttjjBvF0feCM=",
            "fileLength": 13596
        }
    }
}
POST
Get Message Status
{{host}}/message/status
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "id": "3EB0078FCA3E48FC70D761"
}
POST
Delete Message
{{host}}/message/delete
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "chat": "5511999999999@s.whatsapp.net",
    "messageId": "3EB0078FCA3E48FC70D761"
}
POST
Edit Message
{{host}}/message/edit
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "chat": "5511999999999@s.whatsapp.net",
    "messageId": "3EB0CAEDE886F69B2BF4A7",
    "message": "mensagem editada"
}
Chat
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
POST
Pin Chat
{{host}}/chat/pin
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "chat": "5511999999999@s.whatsapp.net"
}
POST
UnPin Chat
{{host}}/chat/unpin
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "chat": "5511999999999@s.whatsapp.net"
}
POST
Archive Chat
{{host}}/chat/archive
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "chat": "5511999999999@s.whatsapp.net"
}
POST
Unarchive Chat
{{host}}/chat/unarchive
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "chat": "5511999999999@s.whatsapp.net"
}
POST
Mute Chat
{{host}}/chat/mute
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "chat": "5511999999999@s.whatsapp.net"
}
POST
Unmute Chat
{{host}}/chat/unmute
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "chat": "5511999999999@s.whatsapp.net"
}
POST
History Sync Request
{{host}}/chat/history-sync
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "messageInfo": {
        "Chat": "120363026465248932@g.us",
        "ID": "4B320468A81169EEC9E72DF66382169D",
        "IsFromMe": false,
        "IsGroup": true,
        "Timestamp": "2025-02-19T13:07:15-03:00"
    },
    "count": 10
}
Group
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
GET
List Groups
{{host}}/group/list
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
POST
Get Group Info
{{host}}/group/info
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "groupJid": "120363314613377653@g.us"
}
POST
Get Group Invite Link
{{host}}/group/invitelink
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "groupJid": "120363281584341832@g.us"
}
POST
Set Group Picture
{{host}}/group/photo
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
View More
json
{
    "groupJid": "120363281584341832@g.us",
    "image": "https://i.etsystatic.com/43909860/r/il/6ae03d/5002111235/il_570xN.5002111235_foat.jpg"
}
POST
Set Group Name
{{host}}/group/name
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "groupJid": "120363281584341832@g.us",
    "name": "Teste"
}
POST
Set Group Description
{{host}}/group/description
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "groupJid": "120363281584341832@g.us",
    "description": "Descrição do grupo"
}
POST
Create Group
{{host}}/group/create
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "groupName": "Teste Whatsmeow",
    "participants": [
        "557499879409"
    ]
}
POST
Update Participant
{{host}}/group/participant
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "groupJid": "120363332413160732@g.us",
    "participants": [
        "557499879409"
    ],
    "action": "demote" /* add, remove, promote, demote */
}
GET
Get My Groups
{{host}}/group/myall
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
POST
Join Group Link
{{host}}/group/join
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "code": ""
}
POST
Leave Group
{{host}}/group/leave
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "groupJid": "120363281584341832@g.us"
}
Call
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
POST
Reject Call
{{host}}/call/reject
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "callCreator": "557499879409@s.whatsapp.net",
    "callId": "EA25BF75464586B0DA8AAF03B74D1AE8"
}
Community
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
POST
Create Community
{{host}}/community/create
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "communityName": "Teste Whatsmeow"
}
POST
Add Group to Community
{{host}}/community/add
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "communityJid": "120363331164431348@g.us",
    "groupJid": ["120363332413160732@g.us"]
}
POST
Remove Group to Community
{{host}}/community/remove
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "communityJid": "120363331164431348@g.us",
    "groupJid": ["120363332413160732@g.us"]
}
Label
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
POST
Add Label on Chat
{{host}}/label/chat
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "jid": "557498028235@s.whatsapp.net",
    "labelId": "8"
}
POST
Remove Label on Chat
{{host}}/unlabel/chat
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "jid": "557498028235@s.whatsapp.net",
    "labelId": "8"
}
POST
Add Label on Message
{{host}}/label/message
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "jid": "120363331164431348@g.us",
    "messageId": "",
    "labelId": ""
}
POST
Remove Label on Message
{{host}}/unlabel/message
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "jid": "120363331164431348@g.us",
    "messageId": "",
    "labelId": ""
}
POST
Edit Label
{{host}}/label/edit
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "labelId": "",
    "name": "label",
    "color": 1,
    "deleted": true
}
GET
List Labels
{{host}}/label/list
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Newsletter
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
POST
Create Newsletter
{{host}}/newsletter/create
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "name": "Teste Whatsmewo",
    "description": "teste"
}
GET
List Newsletters
{{host}}/newsletter/list
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
POST
Get Newsletter Info
{{host}}/newsletter/info
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "jid": "120363316177781703@newsletter"
}
POST
Get Newsletter Link
{{host}}/newsletter/link
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "key": "0029VajBUmtAjPXGt6uLYA10"
}
POST
Subscribe on Newsletter
{{host}}/newsletter/subscribe
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "jid": "120363316177781703@newsletter"
}
POST
Get Newsletter Messages
{{host}}/newsletter/messages
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Body
raw (json)
json
{
    "jid": "120363316177781703@newsletter",
    "count": 1
}
Polls
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
GET
Get Poll Results
{{host}}/polls/:pollMessageId/results
﻿

Authorization
API Key
This request is using an authorization helper from collection Evolution GO
Path Variables
pollMessageId
3EB08443D6D1D27E1D48B1
Server
﻿

Authorization
API Key
This folder is using an authorization helper from collection Evolution GO
GET
Server Health
{{host}}/server/ok
﻿