// Code by @Arm4x

var varint = require('varint')
var buffertools = require('buffertools');
var zlib = require('zlib');
var crypto = require('crypto');
var assert = require('assert');
var Long = require('long');
var utf8 = require('utf8');

module.exports = {
    CraftString: function(str) {
        var utfString = new Buffer([str.length])
        utfString = buffertools.concat(
                                    utfString,
                                    utf8.encode(str)
                                   )
        return utfString
    },

    ReadCraftString: function(buffer, voffset) {
        var byte_read = 0
        var strLen = varint.decode(buffer, offset=voffset)
        byte_read += varint.decode.bytes
        var str = buffer.slice(voffset+byte_read, end=voffset+byte_read+strLen).toString()
        byte_read += strLen
        return {'string':str,'byte_read':byte_read}
    },

    ParseChat: function(ch) {
        if(ch.translate=="chat.type.text") {
            return msg = "<"+ch.with[0].insertion+"> "+ch.with[1]
        }
        else if(ch.translate=="chat.type.announcement") {
            return msg = "["+ch.with[0].text+"] "+ch.with[1].extra[0].text
        }
        else if(ch.translate=="death.attack.player") {
            return msg = ch.with[0].insertion + " was slain by " +ch.with[1].insertion
        }
        else if(ch.translate=="death.attack.mob") {
            return msg = ch.with[0].insertion + " was slain by " +ch.with[1].text
        }
        return JSON.stringify(ch)
    },

    ReadByte: function(buffer, voffset) {
        return buffer.slice(voffset, voffset+1)[0]
    },

    ReadInt: function(buffer, voffset) {
        return buffer.slice(voffset, end=voffset+4).readInt32BE()
    },

    ReadFloat: function(buffer, voffset) {
        return buffer.slice(voffset, voffset+4).readFloatBE(0)
    },

    ReadDouble: function(buffer, voffset) {
        return buffer.slice(voffset, voffset+8).readDoubleBE(0)
    },

    CompressPacket: function(thold,pBuffer) {
        var datalen = varint.encode(pBuffer.length)
        if(pBuffer.length>thold) {
            var compressedpBuffer = zlib.deflateSync(pBuffer)
        }
        else {
            var compressedpBuffer = pBuffer
            datalen = varint.encode(0)
        }
        var packetlen = new Buffer([(varint.encode(compressedpBuffer.length + datalen.length))])
        var packet =  buffertools.concat(packetlen, new Buffer([datalen]), compressedpBuffer)
        return packet
    },

    // Function from https://gist.github.com/andrewrk/4425843
    mcHexDigest: function(str) {
        var hash = new Buffer(crypto.createHash('sha1').update(str).digest(), 'binary');
        // check for negative hashes
        var negative = hash.readInt8(0) < 0;
        if (negative) performTwosCompliment(hash);
        var digest = hash.toString('hex');
        // trim leading zeroes
        digest = digest.replace(/^0+/g, '');
        if (negative) digest = '-' + digest;
        return digest;
    },

    // Function from https://gist.github.com/andrewrk/4425843
    performTwosCompliment: function(buffer) {
        var carry = true;
        var i, newByte, value;
        for (i = buffer.length - 1; i >= 0; --i) {
            value = buffer.readUInt8(i);
            newByte = ~value & 0xff;
            if (carry) {
                carry = newByte === 0xff;
                buffer.writeUInt8(newByte + 1, i);
            } else {
                buffer.writeUInt8(newByte, i);
            }
        }
    },

    swap16: function(val) {
        return ((val & 0xFF) << 8)
               | ((val >> 8) & 0xFF);
    }

}
