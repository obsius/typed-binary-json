'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
// magic number for file type
var MAGIC_NUMBER = exports.MAGIC_NUMBER = '.tbj';
var SIZE_MAGIC_NUMBER = exports.SIZE_MAGIC_NUMBER = 4;

// types
var NULL = exports.NULL = 0;
var BYTE = exports.BYTE = 1;
var BOOL = exports.BOOL = 2;
var UINT8 = exports.UINT8 = 3;
var INT8 = exports.INT8 = 4;
var UINT16 = exports.UINT16 = 5;
var INT16 = exports.INT16 = 6;
var UINT32 = exports.UINT32 = 7;
var INT32 = exports.INT32 = 8;
var FLOAT32 = exports.FLOAT32 = 9;
var FLOAT64 = exports.FLOAT64 = 10;
var STRING = exports.STRING = 11;
var ARRAY = exports.ARRAY = 12;
var OBJECT = exports.OBJECT = 13;
var CUSTOM = exports.CUSTOM = 14;

// type sizes
var SIZE_NULL = exports.SIZE_NULL = 1;
var SIZE_BYTE = exports.SIZE_BYTE = 1;
var SIZE_BOOL = exports.SIZE_BOOL = 1;
var SIZE_INT8 = exports.SIZE_INT8 = 1;
var SIZE_UINT8 = exports.SIZE_UINT8 = 1;
var SIZE_INT16 = exports.SIZE_INT16 = 2;
var SIZE_UINT16 = exports.SIZE_UINT16 = 2;
var SIZE_INT32 = exports.SIZE_INT32 = 4;
var SIZE_UINT32 = exports.SIZE_UINT32 = 4;
var SIZE_FLOAT32 = exports.SIZE_FLOAT32 = 4;
var SIZE_FLOAT64 = exports.SIZE_FLOAT64 = 8;

var TYPE_OFFSET = exports.TYPE_OFFSET = 32;
var CLASS_OFFSET = exports.CLASS_OFFSET = 64;
var ARRAY_OFFSET = exports.ARRAY_OFFSET = 512;