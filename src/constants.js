// magic number for file type
export const MAGIC_NUMBER =                 '.tbj';
export const SIZE_MAGIC_NUMBER =            4;

export const VERSION =                      1;

// error
export const ERROR =                        -1;

// primitive types
export const NULL =                         0;
export const BOOL =                         1;
export const UINT8 =                        2;
export const INT8 =                         3;
export const UINT16 =                       4;
export const INT16 =                        5;
export const UINT32 =                       6;
export const INT32 =                        7;
export const FLOAT32 =                      8;
export const FLOAT64 =                      9;

// higher-order types
export const STRING =                       10;
export const ARRAY =                        11;
export const OBJECT =                       12;
export const NULLABLE =                     13;
export const TYPED_ARRAY =                  14;
export const UNKNOWN =                      15;

// extras
export const VARIABLE_DEF =                 16;
export const INSTANCE =                     17;

// primitive sizes
export const SIZE_NULL =                    1;
export const SIZE_BOOL =                    1;
export const SIZE_INT8 =                    1;
export const SIZE_UINT8 =                   1;
export const SIZE_INT16 =                   2;
export const SIZE_UINT16 =                  2;
export const SIZE_INT32 =                   4;
export const SIZE_UINT32 =                  4;
export const SIZE_FLOAT32 =                 4;
export const SIZE_FLOAT64 =                 8;

// offsets
export const NULLABLE_OFFSET =              16;
export const TYPED_ARRAY_OFFSET =           32;
export const TYPE_OFFSET =                  48;
export const PROTOTYPE_OFFSET =             64;   // support 16 types
export const NULLABLE_PROTOTYPE_OFFSET =    256;  // support 192 prototypes
export const ARRAY_OFFSET =                 512;
export const OBJECT_OFFSET =                4096; // support 4x nested array

// legacy offsets
export const L_NULLABLE_PROTOTYPE_OFFSET =  160;
export const L_ARRAY_OFFSET =               256;
export const L_OBJECT_OFFSET =              1024;

// defaults
export const DEFAULT_BUFFER_SIZE =          1048576;
export const DEFAULT_NUM_ENCODING =         FLOAT64;
export const DEFAULT_STR_ENCODING =         'utf8';
export const DEFAULT_X_FACTOR =             2;