const jwt = require("jsonwebtoken");
const Airtable = require("airtable");
const bcrypt = require("bcrypt");
const axios = require("axios").default;

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: "keyFpXfRESHia3TUo"
});


var base = Airtable.base("appl5N2S5ynIWUTRh")

exports.handler = async function (event) {

    try {
        let token = event.token;
        let decodedToken = jwt.verify(token, "SOMESECRETSECRET");

        let data = []
        let name = decodedToken.user.fields.Name;
        var result = await base("Leaves").select({
            filterByFormula: `FIND("${name}",{Users})`,
            sort: [{ field: "Request Date", direction: "desc" }]
        })
        result = await result.firstPage();
        result.forEach(el => {
            data.push(el.fields)
        })
        return data
    } catch (error) {
        return { statusCode: 401, message: "UNAUTHORIZED" }
    }

}



let inputData = {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoicmVjUldHVzNNS1UxTDZkMjAiLCJjcmVhdGVkVGltZSI6IjIwMjItMDQtMjJUMDQ6MjA6NTguMDAwWiIsImZpZWxkcyI6eyJMZWF2ZSBMaW5rIjpbInJlY2R1MzN0aW43Y0R1VHhoIiwicmVjUkJRcE5wSmJsZXpvdm0iLCJyZWNyazNUdGpTMXNOc2Q0dyJdLCJMZWF2ZSBUcmFuc2FjdGlvbiBMaW5rIjpbInJlY2xsTE1PNWtTbUJIZnI5IiwicmVjZ1FNaE9oTzBRenhMak0iLCJyZWM0OUFhRDdYVzI4Z3p6cSIsInJlY2tucHZwUldmTlFWcjRWIiwicmVjNm05a2FPV0dnTUg5ZmciXSwiRW1haWwiOiJwYXNjb2FsQGFqZW5jeS5pbiIsIlRlYW1zIChCZWxvbmdzIFRvKSI6WyJyZWNEM29henpaN25xSWxoTiJdLCJJcyBBZG1pbiI6InRydWUiLCJOYW1lIjoiUGFzY29hbCBGZXJuYW5kZXMiLCJMZWF2ZSBFYXJuZWQgQ291bnQiOjIzLCJMZWF2ZSBUYWtlbiBDb3VudCI6MTEsIkxlYXZlIEJhbGFuY2UiOjEyLCJMZWFkZXIgKGZyb20gVGVhbXMgTGluaykiOlsicmVjMTJqR0pBSXY4VWIyRjgiXSwiUmVjb3JkIElEIjoicmVjUldHVzNNS1UxTDZkMjAifX0sImlhdCI6MTY1MzY0NzIzMiwiZXhwIjoxNjUzNzMzNjMyfQ.OnaO7wZZJMd0IqxRy7G7fUBs0EYEbJf_EsD23XfNnPo"
}


this.handler(inputData).then(res => {
    console.log(res)
})