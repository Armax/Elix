// Code by @Arm4x

var net = require('net');
var EventEmitter = require('events').EventEmitter
var varint = require('varint')
var utf8 = require('utf8');
var buffertools = require('buffertools');
var zlib = require('zlib');
var crypto = require('crypto');
var assert = require('assert');
var request = require('sync-request');
var Long = require('long');
var MCData = require('./mcdata')

// Const
const difficultyArr = ['peaceful','easy','normal','hard']
const entityArr = ['Spawn tipped arrow particle effects','Create rabbit running particles','Entity hurt animation','Entity died animation','Iron Golem throwing up arms','Wolf/Ocelot/Horse taming','Wolf/Ocelot/Horse tamed', 'Wolf shaking water', 'Mark item use as finished', 'Sheep eating grass or Ignite TNT minecart','Iron Golem handing over a rose', 'Villager mating', 'Villager is angry and seeking revenge','Spawn happy particles near a villager','Witch animation','Play zombie converting into a villager sound','Firework exploding','Animal in love (ready to mate)','Reset squid rotation','Spawn explosion particle','Play guardian sound','Enables reduced debug for the given player','Disables reduced debug for the given player','op permission level 0','op permission level 1','op permission level 2','op permission level 3','op permission level 4','Shield block sound','Shield break sound','For a fishing rod bobber','Armorstand hit sound','Entity hurt due to thorns']

function Elix() {
    var self = this
    var events;
    self.events = new EventEmitter();
    var client = new net.Socket();

    var playerInfo = {
        'nickname'              : '',
        'password'              : '',                   // Only for online mode servers
        'server_ip'             : '',
        'port'                  : 25565,
        'protocol_version'      : 110,
        'connected'             : false,
        'state'                 : 'login',
        'thold'                 : -1,
        'brand_sent'            : false,
        'position_loop_start'   : false,
        'spawned'               : false,

        'position': {
            'x':0,
            'y':0,
            'z':0,
            'yaw':0,
            'pitch':0,
            'onground':0
        },
        'elix_debug'            : false
    }

    // Buffer Allocation
    var x = Buffer.alloc(8)
    var y = Buffer.alloc(8)
    var z = Buffer.alloc(8)
    var yaw = Buffer.alloc(4)
    var pitch = Buffer.alloc(4)

    var _packetQueue = new Buffer([])

    function recv(data) {
      _packetQueue = buffertools.concat(
        _packetQueue,
        data
      )
    }

    function getByte() {
        var byte = _packetQueue.slice(0, end=1)
        _packetQueue = _packetQueue.slice(1, end=_packetQueue.length)
        return byte
    }

    function getBytes(n)  {
        var x=0;
        var bytes = new Buffer([])
        while(x<n) {
            var sbyte = getByte()
            if(sbyte == null) {
                DebugPrint("Waiting for data")
            }
            else {
                bytes = buffertools.concat(bytes,sbyte)
                x++
            }
        }
        return bytes
    }

    function DebugPrint(str) {
        if(playerInfo.elix_debug==true) {
            self.events.emit('debug',str)
        }
    }

    function SendPacket(pBuffer) {
        // Uncompressed
        if(playerInfo.thold==-1) {
            var packet = new Buffer([varint.encode(pBuffer.length)])
            packet = buffertools.concat(packet, pBuffer)
        }
        else {
            var packet = MCData.CompressPacket(playerInfo.thold,pBuffer)
        }
        client.write(packet);
    }


    function brand() {
        if(playerInfo.brand_sent==false) {
            var packet = new Buffer([varint.encode(9)])
            packet = buffertools.concat(
                                            packet,
                                            MCData.CraftString("MC|Brand"),
                                            MCData.CraftString("vanilla")
                                       )
            SendPacket(packet)
            DebugPrint("Brand sent!")
            DebugPrint("-------------------------------------------------------------")
        }
    }

    function Chat(str) {
        var packet = new Buffer([0x02])
        packet = buffertools.concat(
                                        packet,
                                        MCData.CraftString(str)
                                   )
        SendPacket(packet)
    }

    self.Connect = function(nickname,password,server_ip,server_port,debug) {
        playerInfo.nickname     = nickname
        playerInfo.password     = password
        playerInfo.server_ip    = server_ip
        playerInfo.server_port  = server_port
        playerInfo.debug        = debug

        client.connect(playerInfo.server_port, playerInfo.server_ip, function() {
            playerInfo.connected = true
        	console.log('[i] ' + playerInfo.nickname + ' connected to ' + playerInfo.server_ip + ":" + playerInfo.port.toString());

            var packet = new Buffer([0x00])
            packet = buffertools.concat(
                                            packet,
                                            new Buffer([varint.encode(playerInfo.protocol_version).toString(16)]),
                                            MCData.CraftString(playerInfo.server_ip),
                                            new Buffer([MCData.swap16(new Uint16Array([playerInfo.port])),new Uint16Array([playerInfo.port])]),
                                            new Buffer(varint.encode(2))
                                        )
        	SendPacket(packet);

            var packet = new Buffer([0x00])
            packet = buffertools.concat(
                                            packet,
                                            MCData.CraftString(playerInfo.nickname)
                                        )

            SendPacket(packet);

            console.log("[i] " + playerInfo.nickname + " joined the game!")
            self.events.emit('join')
            loop()
        });
    }

    client.on('data', function(data) {
        recv(data)
    });

    client.on('close', function() {
        self.events.emit('disconnect', 'connection closed')
        playerInfo.connected = false;
    	console.log(playerInfo.nickname+' disconnected from the server');
    });

    function loop() {
        var rm = 0;
        var voffset = 0
        var packet = 0
        var packet_id = 0
        var data = new Buffer([])
        var packet_len = varint.decode(_packetQueue, offset=0)
        var data = 0

        if(playerInfo.state=="login" && packet_len!=undefined) {
            DebugPrint("-------------------------------------------------------------")
            // Remove bytes from the queue
            rm = getBytes(varint.decode.bytes)

            // Get packet
            packet = getBytes(packet_len)

            // Check if compressed
            if(playerInfo.thold != -1) {
                var data_len = varint.decode(packet, offset=0)
                voffset = varint.decode.bytes

                if(data_len != 0) {
                    data = zlib.inflateSync(packet.slice(voffset, end=packet.length))
                }
                else {
                    data = packet.slice(voffset, end=packet.length)
                }
            }
            else {
                data = packet
            }

            packet_id = varint.decode(data, offset=0)
            voffset = varint.decode.bytes

            switch(packet_id) {
                case 0x00:
                    var str = MCData.ReadCraftString(data,voffset)
                    var text = str['string']
                    voffset += parseInt(str['byte_read'])

                    DebugPrint("Received Disconnect (login) packet")
                    DebugPrint("Message: "+text)
                    self.events.emit('disconnect', text)
                    playerInfo.connected = false;
                    break;
                case 0x01:
                    // Server ID
                    var str = MCData.ReadCraftString(data,voffset)
                    var server_id = str['string']
                    voffset += parseInt(str['byte_read'])
                    // Public key
                    var public_key_len = varint.decode(data, offset=voffset)
                    voffset += varint.decode.bytes
                    var public_key = data.slice(voffset, end=public_key_len)
                    // Verify Token
                    var verify_token_len = varint.decode(data, offset=voffset)
                    voffset += varint.decode.bytes
                    var verify_token = data.slice(voffset, end=verify_token_len)

                    DebugPrint("Received Encryption Request packet")
                    DebugPrint("Public key:")
                    DebugPrint(public_key)
                    DebugPrint("Verify token:")
                    DebugPrint(verify_token)
                    break;
                case 0x02:
                    // UUID
                    var str = MCData.ReadCraftString(data,voffset)
                    var uuid = str['string']
                    voffset += parseInt(str['byte_read'])

                    // Username
                    var str = MCData.ReadCraftString(data,voffset)
                    var name = str['string']
                    voffset += parseInt(str['byte_read'])

                    DebugPrint("Received Login Success packet")
                    DebugPrint("Username: " + name.toString())
                    DebugPrint("UUID: " + uuid.toString())
                    playerInfo.state = "play"
                    break;
                case 0x03:
                    playerInfo.thold = varint.decode(data, offset=voffset)
                    voffset += varint.decode.bytes
                    DebugPrint("Received Set Compression packet")
                    DebugPrint("Threshold: " + playerInfo.thold)
                    break;
                default:
                    console.log("Unrecognized packed id: " + packet_id)
                    break;
            }
        }
        else if(playerInfo.state=="play" && packet_len!=undefined) {
            DebugPrint("-------------------------------------------------------------")
            // Remove bytes from the queue
            rm = getBytes(varint.decode.bytes)

            // Get packet
            packet = getBytes(packet_len)

            // Check if compressed
            if(playerInfo.thold != -1) {
                var data_len = varint.decode(packet, offset=0)
                voffset += varint.decode.bytes

                if(data_len != 0) {
                    data = zlib.inflateSync(packet.slice(voffset, end=packet.length))
                }
                else {
                    data = packet.slice(voffset, end=packet.length)
                }
            }
            else {
                data = packet
            }

            packet_id = varint.decode(data, offset=0)
            voffset = varint.decode.bytes

            switch(packet_id) {
                case 0x00:
                    DebugPrint("Received Spawn Object packet")
                    break;
                case 0x01:
                    DebugPrint("Received Spawn Experience Orb packet")
                    break;
                case 0x02:
                    DebugPrint("Received Spawn Global Entity packet")
                    break;
                case 0x03:
                    DebugPrint("Received Spawn Mob packet")
                    break;
                case 0x04:
                    DebugPrint("Received Spawn Painting packet")
                    break;
                case 0x05:
                    DebugPrint("Received Spawn Player packet")
                    break;
                case 0x06:
                	DebugPrint("Received 0x06 packet")
                	break;
                case 0x07:
                    //wip
                	DebugPrint("Received Statistics packet")
                	break;
                case 0x08:
                	DebugPrint("Received 0x08 packet")
                	break;
                case 0x09:
                	DebugPrint("Received 0x09 packet")
                	break;
                case 0x0a:
                	DebugPrint("Received 0x0a packet")
                	break;
                case 0x0b:
                	DebugPrint("Received 0x0b packet")
                	break;
                case 0x0c:
                	DebugPrint("Received 0x0c packet")
                	break;
                case 0x0d:
                    var difficulty = parseFloat(MCData.ReadByte(data,voffset))
                	DebugPrint("Received Server Difficulty packet")
                    DebugPrint("Difficulty: " + difficultyArr[difficulty])
                	break;
                case 0x0e:
                	DebugPrint("Received 0x0e packet")
                	break;
                case 0x0f:
                    // Reading chat
                    var str = MCData.ReadCraftString(data,voffset)
                    var msg = MCData.ParseChat(JSON.parse(str['string']))

                    voffset += parseInt(str['byte_read'])

                	DebugPrint("Received Chat Message packet")
                    self.events.emit('chat', msg);
                	break;
                case 0x10:
                	DebugPrint("Received 0x10 packet")
                	break;
                case 0x11:
                	DebugPrint("Received 0x11 packet")
                	break;
                case 0x12:
                	DebugPrint("Received 0x12 packet")
                	break;
                case 0x13:
                	DebugPrint("Received 0x13 packet")
                	break;
                case 0x14:
                	DebugPrint("Received 0x14 packet")
                	break;
                case 0x15:
                	DebugPrint("Received 0x15 packet")
                	break;
                case 0x16:
                	DebugPrint("Received 0x16 packet")
                	break;
                case 0x17:
                	DebugPrint("Received 0x17 packet")
                	break;
                case 0x18:
                    // Channel
                    var str = MCData.ReadCraftString(data,voffset)
                    var channel = str['string']
                    voffset += parseInt(str['byte_read'])
                    // Data
                    var chdata = ""
                    if(channel=="MC|Brand") {
                        var str = MCData.ReadCraftString(data,voffset)
                        chdata = str['string']
                        voffset += parseInt(str['byte_read'])
                    }
                	DebugPrint("Received Plugin Message packet")
                    DebugPrint("Channel: " + channel)
                    DebugPrint("Data: " + chdata)
                	break;
                case 0x19:
                	DebugPrint("Received 0x19 packet")
                	break;
                case 0x1a:
                	DebugPrint("Received 0x1a packet")
                	break;
                case 0x1b:
                    var entity_id = MCData.ReadInt(data,voffset)
                    voffset += 4

                    var entity_status = MCData.ReadByte(data,voffset)
                    voffset += 1

                	DebugPrint("Received Entity Status packet")
                    DebugPrint("Entity ID: " + entity_id)
                    DebugPrint("Entity Status: " + entityArr[entity_status].toString())
                	break;
                case 0x1c:
                	DebugPrint("Received 0x1c packet")
                	break;
                case 0x1d:
                	DebugPrint("Received 0x1d packet")
                	break;
                case 0x1e:
                	DebugPrint("Received 0x1e packet")
                	break;
                case 0x1f:
                    DebugPrint("Received Keep Alive packet")
                    break;
                case 0x20:
                    // still wip
                	DebugPrint("Received Chunk Data packet")
                	break;
                case 0x21:
                	DebugPrint("Received 0x21 packet")
                	break;
                case 0x22:
                	DebugPrint("Received 0x22 packet")
                	break;
                case 0x23:
                    // Entity
                    var entity_id = MCData.ReadInt(data,voffset)
                    voffset += 4
                    // Gamemode
                    var gamemode = MCData.ReadByte(data,voffset)
                    var hardcore = (gamemode >> 7) & 0x01
                    voffset += 1
                    // Dimension
                    var dimension = MCData.ReadInt(data,voffset)
                    voffset += 4
                    // Difficulty
                    var difficulty = MCData.ReadByte(data,voffset)
                    voffset += 1
                    // Max players
                    var max_player = MCData.ReadByte(data,voffset)
                    voffset += 1
                    // Level type
                    var str = MCData.ReadCraftString(data,voffset)
                    var level_type = str['string']
                    voffset += parseInt(str['byte_read'])
                    // Reduced debug info
                    var reduced_debug_info = MCData.ReadByte(data,voffset)

                    DebugPrint("Received Join Game packet")
                    DebugPrint("Entity ID: " + entity_id)
                    DebugPrint("Gamemode: " + gamemode)
                    DebugPrint("Hardcore: " + hardcore)
                    DebugPrint("Dimension: " + dimension)
                    DebugPrint("Difficulty: " + difficulty)
                    DebugPrint("Max player: " + max_player)
                    DebugPrint("Level type: " + level_type)
                    DebugPrint("Reduced debug info: " + reduced_debug_info)
                    break;
                case 0x24:
                	DebugPrint("Received 0x24 packet")
                	break;
                case 0x25:
                	DebugPrint("Received 0x25 packet")
                	break;
                case 0x26:
                	DebugPrint("Received 0x26 packet")
                	break;
                case 0x27:
                	DebugPrint("Received 0x27 packet")
                	break;
                case 0x28:
                	DebugPrint("Received 0x28 packet")
                	break;
                case 0x29:
                	DebugPrint("Received 0x29 packet")
                	break;
                case 0x2a:
                	DebugPrint("Received 0x2a packet")
                	break;
                case 0x2b:
                    brand()
                    // Flags decoding
                    var flags = MCData.ReadByte(data,voffset)
                    voffset += 1

                    var invulnerable = flags & 0x01
                    var flying = (flags >> 1) & 0x01
                    var allow_fly = (flags >> 3) & 0x01
                    var creative = (flags >> 7) & 0x01
                    // Flying Speed
                    var flying_speed = MCData.ReadFloat(data,voffset)
                    voffset += 4
                    // Field of view modifier
                    var fovw =  MCData.ReadFloat(data,voffset)
                    voffset += 4

                	DebugPrint("Received Player Abilities packet")
                    DebugPrint("Invulnerable: " + invulnerable)
                    DebugPrint("Flying: " + flying)
                    DebugPrint("Allow Fly: " + allow_fly)
                    DebugPrint("Creative: " + creative)
                    DebugPrint("Flying Speed: " + flying_speed)
                    DebugPrint("Fovw: " + fovw)
                	break;
                case 0x2c:
                	DebugPrint("Received 0x2c packet")
                	break;
                case 0x2d:
                    //wip
                	DebugPrint("Received Player List Item packet")
                	break;
                case 0x2e:
                    // X Y Z player position as double
                    var x = MCData.ReadDouble(data,voffset)
                    voffset += 8
                    var y = MCData.ReadDouble(data,voffset)
                    voffset += 8
                    var z = MCData.ReadDouble(data,voffset)
                    voffset += 8
                    // Yaw & Pitch as float
                    var yaw = MCData.ReadFloat(data,voffset)
                    voffset += 4
                    var pitch = MCData.ReadFloat(data,voffset)
                    voffset += 4
                    // Flags as byte
                    var flags = MCData.ReadByte(data,voffset)
                    voffset += 1
                    // Teleport ID as varint
                    var teleport_id = varint.decode(data, offset=voffset)

                    // Confirm teleplayerInfo.port
                    var packet = new Buffer([0x00])
                    packet = buffertools.concat(
                                                    packet,
                                                    new Buffer([varint.encode(teleport_id)])
                                                )

                    // Updating player info
                    playerInfo.position.x = x
                    playerInfo.position.y = y
                    playerInfo.position.z = z
                    playerInfo.position.yaw = yaw
                    playerInfo.position.pitch = pitch
                    playerInfo.position.onground = 0

                    if(playerInfo.position_loop_start==false) {
                        positionLoop()
                        playerInfo.position_loop_start = true
                        self.events.emit('ready')
                    }

                	DebugPrint("Received Player Position And Look packet")
                    DebugPrint("X: " + x)
                    DebugPrint("Y: " + y)
                    DebugPrint("Z: " + z)
                    DebugPrint("Yaw: " + yaw)
                    DebugPrint("Pitch: " + pitch)
                    DebugPrint("Flags: " + flags)
                    DebugPrint("TeleplayerInfo.port ID: " + teleport_id)
                	break;
                case 0x2f:
                	DebugPrint("Received 0x2f packet")
                	break;
                case 0x30:
                	DebugPrint("Received 0x30 packet")
                	break;
                case 0x31:
                	DebugPrint("Received 0x31 packet")
                	break;
                case 0x32:
                	DebugPrint("Received 0x32 packet")
                	break;
                case 0x33:
                	DebugPrint("Received 0x33 packet")
                	break;
                case 0x34:
                    var entity_id = varint.decode(data, offset=voffset)
                    voffset += varint.decode.bytes

                    var angle = MCData.ReadByte(data,voffset)
                    voffset += 1

                    DebugPrint("Received Entity Head Look packet")
                    DebugPrint("Entity ID: " + entity_id)
                    DebugPrint("Angle: " + angle)
                    break;
                case 0x35:
                	DebugPrint("Received 0x35 packet")
                	break;
                case 0x36:
                	DebugPrint("Received 0x36 packet")
                	break;
                case 0x37:
                    var slot = MCData.ReadByte(data,voffset)
                    voffset += 1

                	DebugPrint("Received Held Item Change packet")
                    DebugPrint("Slot: " + slot.toString())
                	break;
                case 0x38:
                	DebugPrint("Received 0x38 packet")
                	break;
                case 0x39:
                    // WIP
                	DebugPrint("Received Entity Metadata packet")
                	break;
                case 0x3a:
                	DebugPrint("Received 0x3a packet")
                	break;
                case 0x3b:
                    // wip
                	DebugPrint("Received Entity Velocity packet")
                	break;
                case 0x3c:
                    // wip
                	DebugPrint("Received Entity Equipment packet")
                	break;
                case 0x3d:
                	DebugPrint("Received 0x3d packet")
                	break;
                case 0x3E:
                    // Health
                    var health = MCData.ReadFloat(data,voffset)
                    voffset += 4
                    // Food
                    var food = varint.decode(data, offset=voffset)
                    // Food Saturation
                    var food_saturation = MCData.ReadFloat(data,voffset)
                    voffset += 4

                    DebugPrint("Received Update Health packet")
                    DebugPrint("Health: " + health + " Food: " + food)
                    DebugPrint("Food saturation: " + food_saturation)
                    self.events.emit('healthUpdate', {'health':health,food:food})

                    if(health <= 0) {
                        self.events.emit('died')
                    }
                    break;
                case 0x3f:
                	DebugPrint("Received 0x3f packet")
                	break;
                case 0x40:
                	DebugPrint("Received 0x40 packet")
                	break;
                case 0x41:
                	DebugPrint("Received 0x41 packet")
                	break;
                case 0x42:
                	DebugPrint("Received 0x42 packet")
                	break;
                case 0x43:
                    var buff = data.slice(voffset, voffset+8);
                    var high = buff.readUInt32BE(0);
                    var low = buff.readUInt32BE(4);
                    var val = Long.fromBits(low, high, unsigned=false)

                    var x = val.shr(38)
                    var y = (val.shru(26)) & 0xFFF
                    var z = val.shl(38).shru(38)

                	DebugPrint("Received Spawn Position packet")
                    DebugPrint("X: " + x)
                    DebugPrint("Y: " + y)
                    DebugPrint("Z: " + z)
                	break;
                case 0x44:
                	DebugPrint("Received 0x44 packet")
                	break;
                case 0x45:
                	DebugPrint("Received 0x45 packet")
                	break;
                case 0x46:
                	DebugPrint("Received 0x46 packet")
                	break;
                case 0x47:
                	DebugPrint("Received 0x47 packet")
                	break;
                case 0x48:
                	DebugPrint("Received 0x48 packet")
                	break;
                case 0x49:
                	DebugPrint("Received 0x49 packet")
                	break;
                case 0x4a:
                    // wip
                	DebugPrint("Received Entity Properties packet")
                	break;
                case 0x4b:
                	DebugPrint("Received 0x4b packet")
                	break;
                default:
                    DebugPrint("Unrecognized packet id: 0x" + packet_id.toString(16))
                    break;
            }

        }
        if(playerInfo.connected==true) {
            setTimeout(loop, 0);
        }
    }

    // Every 50 ms the client should send a 0x0D
    function positionLoop() {
        var packet = 0;
        if(playerInfo.spawned==false) {
            packet = new Buffer([0x03])
            packet = buffertools.concat(
                                            packet,
                                            new Buffer([varint.encode(0)])
                                       )
            SendPacket(packet)
            playerInfo.spawned = true
        }
        packet = new Buffer([0x0D])

        x.writeDoubleBE(playerInfo.position.x,0)
        y.writeDoubleBE(playerInfo.position.y,0)
        z.writeDoubleBE(playerInfo.position.z,0)
        yaw.writeFloatBE(playerInfo.position.yaw,0)
        pitch.writeFloatBE(playerInfo.position.pitch,0)

        packet = buffertools.concat(
                                        packet,
                                        x,
                                        y,
                                        z,
                                        yaw,
                                        pitch,
                                        Buffer.from([0x01])
                                    )
        SendPacket(packet)
        if(playerInfo.connected==true) {
            setTimeout(positionLoop, 50);
        }
    }

    self.Chat = function(str) {
        Chat(str)
    }

    self.Respawn = function() {
            packet = new Buffer([0x03])
            packet = buffertools.concat(packet,Buffer.from([0x00]))
            SendPacket(packet)
    }

}

module.exports = new Elix();
module.exports.Elix = Elix;
