// magic number for file type
export const MAGIC_NUMBER =      '.tbj';
export const SIZE_MAGIC_NUMBER = 4;

// primitive types
export const NULL =        0;
export const BOOL =        1;
export const UINT8 =       2;
export const INT8 =        3;
export const UINT16 =      4;
export const INT16 =       5;
export const UINT32 =      6;
export const INT32 =       7;
export const FLOAT32 =     8;
export const FLOAT64 =     9;

// higher-order types
export const STRING =      10;
export const ARRAY =       11;
export const OBJECT =      12;
export const NULLABLE =    13;
export const TYPED_ARRAY = 14;

// primitive sizes
export const SIZE_NULL =    1;
export const SIZE_BOOL =    1;
export const SIZE_INT8 =    1;
export const SIZE_UINT8 =   1;
export const SIZE_INT16 =   2;
export const SIZE_UINT16 =  2;
export const SIZE_INT32 =   4;
export const SIZE_UINT32 =  4;
export const SIZE_FLOAT32 = 4;
export const SIZE_FLOAT64 = 8;

// offsets
export const NULLABLE_OFFSET =    16;
export const TYPED_ARRAY_OFFSET = 32;
export const TYPE_OFFSET =        48;
export const PROTOTYPE_OFFSET =   80;
export const ARRAY_OFFSET =       256;
export const OBJECT_OFFSET =      512;