# sails-hook-sequeliz-blueprints
Sails V1.5 blueprints for sequelize ORM V6
To be used with sails-hook-sequeliz


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

## Package.json

Include in package.json git reference to this package (see following example)

```javascript
{
  "name": "test",
  "private": true,
  "version": "0.0.0",
  "description": "application",
  "keywords": [],
  "dependencies": {
    "@babel/preset-env": "7.15.6",
  
    "sails": "^1.5.0",
    "sails-disk": "~2.1.0",
    "sails-hook-cron": "^3.2.0",
    "sails-hook-grunt": "^5.0.0",
    "sails-hook-sequelize": "git://github.com/aristot/sails-hook-sequeliz",
    "sails-hook-sequeliz-blueprints": "git://github.com/aristot/sails-hook-sequeliz-blueprints",
    "sails-hook-sockets": "2.0.1",
    "sails-hook-validation": "^0.4.7",
    "sequelize": "^6.6.5",
    "sequelize-cli": "^6.2.0",
    "tedious": "^12.2.0",
  },
  "repository": {
    
  },
  
  "devDependencies": {
  },
  "config": {
    "grunt": "./node_modules/sails/node_modules/.bin/grunt"
  },
  "main": "app.js",
  "license": "MIT",
  "engines": {
    "node": "~14.17.x",
    "npm": "~7.20.x"
  }
}
```

## Connections
Sequelize connection with sqlserver 2019 Express


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

# New version 2021 customized for new Sail V1.5 version and Sequelize V6 version
This is an experimental hook  developed by Raymond FEST from ARISTOT compagny and tested with sqlServer 2019 database
populate is disabled
reduce usage of lodash
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
