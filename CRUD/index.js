const express = require('express');
const {Datastore} = require('@google-cloud/datastore');
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager')

const datastore = new Datastore();
const secretManagerServiceClient = new SecretManagerServiceClient();
const app = express();

const MAX_PAGE_SIZE = 10;

function buildPageable({pageSize, pageNumber}) {
    if (isNaN(pageSize) || isNaN(pageNumber)) {
        return {limit: 10, offset: 0}
    }
    const limit = Math.max(Math.min(MAX_PAGE_SIZE, +pageSize), 1);
    const offset = Math.max(0, limit * +pageNumber)

    return {limit, offset}
}

app.get('/tasks', (req, res) => {
    const pageable = buildPageable(req.query);

    const query = datastore.createQuery('Task')
        .limit(pageable.limit)
        .offset(pageable.offset);

    datastore.runQuery(query).catch(err => {
        res.status(500).send(err.message);
    }).then(([value]) => {
        res.status(200).json(value.map(it => ({
            id: it[datastore.KEY]?.id ?? null,
            name: it.name ?? null,
            description: it.description ?? null
        })));
    });
});

app.post('/tasks', (req, res) => {
    const task = {
        key: datastore.key('Task'),
        data: {
            name: req.body.name,
            description: req.body.description
        }
    }
    datastore.save(task).catch(err => {
        res.status(500).send(err.message);
    }).then(() => {
        res.sendStatus(201);
    })
});

app.get('/tasks/:id', (req, res) => {
    const id = req.params.id;

    datastore.get(datastore.key(['Task', +id])).catch(err => {
        res.status(500).send(err.message);
    }).then(([value]) => {
        if (value == null) {
            res.status(200).json(null);
        } else {
            res.status(200).json({
                id: value[datastore.KEY]?.id ?? null,
                name: value.name ?? null,
                description: value.description ?? null
            });
        }
    })
});

app.get('/secret', (req, res) => {
    secretManagerServiceClient.accessSecretVersion({
        name: `projects/743709002958/secrets/ACCESS_TOKEN_SECRET/versions/latest`
    }).catch(err => {
        res.status(500).send(err.message);
    }).then(([value]) => {
        const secretValue = value.payload.data.toString();
        res.status(200).json(secretValue);
    })
});

app.get('/env', (req, res) => {
    res.status(200).json(process.env.MY_TEST_ENV);
});

exports.app = app;