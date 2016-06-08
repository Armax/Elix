# Elix
Elix is a pure node.js event-based minecraft-protocol implementation that I made for fun and excercise.<br>
Still work in progress

## Usage
### Basics
First require the module in your code
```javascript
var Elix = require('./elix')
```
Then connect to the server
```javascript
Elix.Connect('Elix','','server_ip',25565,false)
```
The last parameter is for debug mode

### Functions
<br>
##### Send a chat message
```javascript
Elix.Chat(msg)
```
<br>
##### Respawn
```javascript
Elix.Respawn()
```
<br>
##### Encode a string as minecraft protocol string (utf8 string with prefixed size as varint)
```javascript
MCData.CraftString(str)
```
<br>
##### Read a minecraft protocol string from a buffer and return an object with string and number of byte read {'string':str,'byte_read':byte_read}
```javascript
MCData.ReadCraftString(str)
```
<br>
##### Parse a minecraft JSON chat and return a string  
```javascript
MCData.ParseChat(JSON)
```
<br>
##### Read a byte from a buffer, voffset is buffer offset
```javascript
MCData.ReadByte(buffer, voffset)
```
<br>
##### Read an Int from a buffer, voffset is buffer offset
```javascript
MCData.ReadInt(buffer, voffset)
```
<br>
##### Read a float from a buffer, voffset is buffer offset
```javascript
MCData.ReadFloat(buffer, voffset)
```
<br>##### Read a byte from a buffer, voffset is buffer offset
```javascript
MCData.ReadByte(buffer, voffset)
```
<br>
##### Read a double from a buffer, voffset is buffer offset
```javascript
MCData.ReadDouble(buffer, voffset)
```
<br>
##### Return a compressed packet based on server threshold
```javascript
MCData.CompressPacket(thold,pBuffer)
```
<br>
### Events
##### When the client receive a chat message
```javascript
Elix.events.on('chat', function(string) {});
```
<br>

##### When the client receive an health update
```javascript
// example of json_object: {'health':20,food:10}
Elix.events.on('healthUpdate', function(json_object) {});
```
<br>

##### Debug messages
```javascript
Elix.events.on('debug', function(string) {});
```
<br>

##### When the client joined the server
```javascript
Elix.events.on('join', function() {});
```
<br>

##### Received all the chunks and spawned
```javascript
Elix.events.on('ready', function() {});
```
<br>

##### When the client is disconnected
```javascript
Elix.events.on('disconnect', function(reason) {});
```
<br>


### Contact me
[@Arm4x](https://twitter.com/Arm4x)
Feel free to contact me for help or anything else
