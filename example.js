// Code by @Arm4x

var Elix = require('./elix')

Elix.Connect('Elix','','server_ip',25565,false)

Elix.events.on('ready', function() {
    Elix.Chat("Hi, I'm ready!")
});

Elix.events.on('chat', function(str) {
  console.log(str);
  Elix.MoveForward()
})

Elix.events.on('healthUpdate', function(hdata) {
    console.log(("Health: " + hdata.health + " Food: " + food))
})

Elix.events.on('died', function() {
    console.log('You died!')
    Elix.Respawn()
})
