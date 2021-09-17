# sails-hook-sequeliz-blueprints
Sails V1.4 blueprints for sequelize ORM V6



The blueprints waterline replaced with Sequelize.

# Install

Install [sails-hook-sequeliz](https://github.com/aristot/sails-hook-sequeliz) first:
```sh
$ npm install sails-hook-sequeliz --save
```

Install this hook with:

```sh
$ npm install sails-hook-sequeliz-blueprints --save
```

Sequelize dependencies:

```sh
$ npm install --save sequelize
$ npm install --save cls-hooked
```

# Configuration

`.sailsrc`

```
"hooks": {
  "blueprints": false,
  "orm": false,
  "pubsub": false
}
```

## Blueprints

Default blueprints configurations config/blueprints.js

```javascript
module.exports.blueprints = {
  actions: true,
  shortcuts: true,
  rest: true,
  autoWatch: true,
}
```

## Connections
Sequelize connection with sqlserver 2019 Express

```javascript
asqlserver: {
    dialect: 'mssql',
    username: 'YourUserName',
    password: 'YourPassword',
    server   : 'localhost',
    options : {
        dialect: 'mssql',
        host   : 'localhost',
        port   : 1433,
        username: 'YourUserName',
        password: 'YourPassword',
        database: 'YourDBName',
        encrypt: false,
        logging:false
    }
}
```

## Models
Sequelize model definition
`models/user.js`
```javascript
module.exports = {
  attributes: {
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    age: {
      type: Sequelize.INTEGER
    }
  },
  associations: function() {
    user.hasMany(image, {
      foreignKey: {
        name: 'owner',
        allowNull: false
      }
    });
    user.belongsToMany(affiliation, {
      as: 'affiliations',
      to: 'users', // must be named as the alias in the related Model
      through: 'UserAffiliation',
      foreignKey: {
        name: 'userId',
        as: 'affiliations'
      }
    });
  },
  options: {
    tableName: 'user',
    classMethods: {},
    instanceMethods: {},
    hooks: {}
  }
};
```

# New version 2021 customized for new Sail V1.4 version and Sequelize V6 version
This is an experimental hook  developed by Raymond FEST from ARISTOT compagny and tested with sqlServer 2019 database
# 2020 03 05 fix bug with util objCompact
# Credits
A big thanks to [festo/sailsjs-sequelize-example](https://github.com/festo/sailsjs-sequelize-example) and [Manuel Darveau's answer](https://groups.google.com/forum/#!msg/sailsjs/ALMxbKfnCIo/H2RcRUnnFGE) that turn this possible with thier sequelize implementations.

[Munkacsy.me](http://munkacsy.me/use-sequelize-with-sails-js/)

# Contributions

1. Fork it!
2. Create your feature branch: git checkout -b my-new-feature
3. Commit your changes: git commit -m 'Add some feature'
4. Push to the branch: git push origin my-new-feature
5. Submit a pull request

# License
[MIT](./LICENSE)
