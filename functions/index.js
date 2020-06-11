const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const app = express();

var MikroNode = require('mikronode');
const Observable = require('rxjs');
const bodyParser = require('body-parser')



admin.initializeApp(functions.config().firebase);
var dns = require('dns');

function castToJson(json) {
    var retorno = [];
    json.forEach(objeto => {
        var usuario = {};
        objeto.forEach(item => {
            usuario[item.field] = item.value;
        });
        retorno.push(usuario);

    });
    return retorno;

}

app.post('/remove', async (req, res) => {
    var address = await getIp(req.body.ip);

    var corpo = req.body;
    var tipoCadastro = "";
    if (corpo.tipo == 'ppp_ativo') {
        tipoCadastro = "/ppp/active/remove";
    } else if (corpo.tipo == 'ppp') {
        tipoCadastro = "/ppp/secret/remove";
    } else if (corpo.tipo == 'ppp_plano') {
        tipoCadastro = "/ppp/profile/remove";
    } else {
      return  res.json({ Erro: "Tipo de consulta inválida" });
    }

    var device = new MikroNode(address);


    device.connect().then(([login]) => {
        return login(corpo.usuario, corpo.senha);
    }).then(function (conn) {
        var chan = conn.openChannel();
        return chan.write(tipoCadastro, { ".id": corpo.id }).then(data => {
            return res.json(data.data);
        })
    }).catch(error => {

        console.log("Error result ", error);
        return res.json({ error: error });
    });

});

app.post('/cadastro', async (req, res) => {

    var corpo = req.body;
    var tipoCadastro = "";
    if (corpo.tipo == 'ppp') {
        if (corpo.conteudo.id != undefined) {
            tipoCadastro = "/ppp/secret/set";
        } else {
            tipoCadastro = "/ppp/secret/add";
        }

    } else {
        res.json({ Erro: "Tipo de consulta inválida" });
    }

    console.log('teste');

    var address = await getIp(corpo.ip);

    var device = new MikroNode(address);

    device.connect().then(([login]) => {
        return login(req.body.usuario, req.body.senha);
    }).then(function (conn) {
        var chan = conn.openChannel();

        return chan.write(tipoCadastro, corpo.conteudo).then(data => {
            return res.json("ok");
        });

    }).catch(error => {
        return res.json({ erro: error });
    });

});


app.get('/consulta', async (req, res) => {
    var corpo = req.body;
    var tipoConsulta = "";
    if (corpo.tipo == 'ppp_ativos') {
        tipoConsulta = "/ppp/active/print";
    } else if (corpo.tipo == 'ppp_cadastrados') {
        tipoConsulta = "/ppp/secret/print";
    } else if (corpo.tipo == 'interfaces') {
        tipoConsulta = "/interface/print";
    } else {
       return res.json({ Erro: "Tipo de consulta inválida" });
    }

    var address = await getIp(req.body.ip);

    var device = new MikroNode(address);


    device.connect().then(([login]) => {
        return login(req.body.usuario, req.body.senha);
    }).then(function (conn) {
        var chan = conn.openChannel();

        // get only a count of the addresses.
        return chan.write(tipoConsulta).then(data => {
            console.log(data.data);
            return res.json(castToJson(data.data));
        }).catch(error => {

            console.log("Error result ", error);
            return res.json({ error: error });
        });


    }).catch(error => {
        return res.json({ erro: error });
    });

});





function getIp(name) {
    return new Promise((resolve, reject) => {
        dns.lookup(name, (err, address, family) => {
            if (err) reject(err);
            return resolve(address);
        });
    });

};



app.use(
    bodyParser.urlencoded({
        extended: true
    })
)

app.use(bodyParser.json())


// Expose the API as a function
exports.api = functions.https.onRequest(app);
