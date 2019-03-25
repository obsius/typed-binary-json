// magic number for file type
export const MAGIC_NUMBER = '.tbj';
export const SIZE_MAGIC_NUMBER = 4;

// types
export const NULL =    0;
export const BYTE =    1;
export const BOOL =    2;
export const UINT8 =   3;
export const INT8 =    4;
export const UINT16 =  5;
export const INT16 =   6;
export const UINT32 =  7;
export const INT32 =   8;
export const FLOAT32 = 9;
export const FLOAT64 = 10;
export const STRING =  11;
export const ARRAY =   12;
export const OBJECT =  13;
export const CUSTOM =  14;

// type sizes
export const SIZE_NULL =    1;
export const SIZE_BYTE =    1;
export const SIZE_BOOL =    1;
export const SIZE_INT8 =    1;
export const SIZE_UINT8 =   1;
export const SIZE_INT16 =   2;
export const SIZE_UINT16 =  2;
export const SIZE_INT32 =   4;
export const SIZE_UINT32 =  4;
export const SIZE_FLOAT32 = 4;
export const SIZE_FLOAT64 = 8;

export const TYPE_OFFSET =  32;
export const CLASS_OFFSET = 64;
export const ARRAY_OFFSET = 512;