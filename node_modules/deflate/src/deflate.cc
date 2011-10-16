// Copyright (C) 2011 John Hewson
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

#include <node.h>
#include <node_buffer.h>
#include <zlib.h>
#include <string.h>
#include <stdlib.h>

using namespace v8;
using namespace node;

////////////////////////////////////////////////////////////////////////////////////////////////////////

static Handle<Value> GetZError(int ret) {
 const char* msg;

 switch (ret) {
 case Z_ERRNO:
   msg = "Z_ERRNO";
   break;
 case Z_STREAM_ERROR:
   msg = "Z_STREAM_ERROR";
   break;
 case Z_DATA_ERROR:
   msg = "Z_DATA_ERROR";
   break;
 case Z_MEM_ERROR:
   msg = "Z_MEM_ERROR";
   break;
 case Z_BUF_ERROR:
   msg = "Z_BUF_ERROR";
   break;
 case Z_VERSION_ERROR:
   msg = "Z_VERSION_ERROR";
   break;
 default:
   msg = "Unknown ZLIB Error";
 }
 
 return ThrowException(Exception::Error(String::New(msg)));
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

class Flater : ObjectWrap {

  private:
   z_stream strm;
   char* input;
   char* output;
   int output_length;
   int status;
   bool finished;
   int output_chunk_size;
   bool isInflater;
   
  public:
       
   static void Init(v8::Handle<v8::Object> target) {
      Local<FunctionTemplate> t = FunctionTemplate::New(New);

      t->InstanceTemplate()->SetInternalFieldCount(1);
      t->SetClassName(String::NewSymbol("Flater"));

      NODE_SET_PROTOTYPE_METHOD(t, "write", SetInput);
      NODE_SET_PROTOTYPE_METHOD(t, "deflate", Deflate);
      NODE_SET_PROTOTYPE_METHOD(t, "read", GetOutput);
      NODE_SET_PROTOTYPE_METHOD(t, "deflateFlush", Finish);
      NODE_SET_PROTOTYPE_METHOD(t, "inflate", Inflate);
      
      target->Set(String::NewSymbol("Flater"), t->GetFunction());
   }
    
   static Handle<Value> New (const Arguments& args) {
      HandleScope scope;
      
      int level = Z_DEFAULT_COMPRESSION;
      int windowBits = 16 + MAX_WBITS; // gzip
      int memLevel = 8;
      int strategy = Z_DEFAULT_STRATEGY;
      int output_chunk_size = 131072; // 128K
      bool isInflater = false;
      
      int idx = 1;
      
      if (args.Length() == 0) {
         Local<Value> exception = Exception::Error(String::New("first argument must be a boolean: deflate=false, inflate=true"));
         return ThrowException(exception);
      }

      isInflater = args[0]->BooleanValue();

      if (args.Length() > 0) {
         if(args[idx+0]->IsNumber()) {
            level = args[idx+0]->Int32Value();        
            if (level < 0 || level > 9) {
               Local<Value> exception = Exception::Error(String::New("level must be between 0 and 9"));
               return ThrowException(exception);
            }
         }
         else if (args[idx+0]->IsString()) {
            char* strLevel = *String::AsciiValue(args[idx+0]->ToString());

            if (strcmp(strLevel, "gzip") == 0) {
               windowBits = 16 + MAX_WBITS;
            }
            else if (strcmp(strLevel, "zlib") == 0) {
               windowBits = MAX_WBITS;
            }
            else if (strcmp(strLevel, "deflate") == 0) {
               windowBits = -MAX_WBITS;
            }
            else {
               Local<Value> exception = Exception::TypeError(String::New("bad deflate kind"));
               return ThrowException(exception);
            }
         }
         else if (args[idx+0]->IsUndefined()) {
         }
         else {
            Local<Value> exception = Exception::TypeError(String::New("expected a Number or String"));
            return ThrowException(exception);
         }

         if (args.Length() > 1) {
            if(args[idx+1]->IsNumber()) {
               level = args[idx+1]->Int32Value();        
               if (level < 0 || level > 9) {
                  Local<Value> exception = Exception::Error(String::New("level must be between 0 and 9"));
                  return ThrowException(exception);
               }
            }
            else if (args[idx+1]->IsUndefined()) {
            }
            else {
               Local<Value> exception = Exception::TypeError(String::New("expected a Number"));
               return ThrowException(exception);
            }
         }

         if (args.Length() > 2) {
            if(args[idx+2]->IsNumber()) {
               output_chunk_size = args[idx+2]->Int32Value();        
               if (output_chunk_size < 0) {
                  Local<Value> exception = Exception::Error(String::New("invalid buffer size"));
                  return ThrowException(exception);
               }
            }
            else if (args[idx+2]->IsUndefined()) {
            }
            else {
               Local<Value> exception = Exception::TypeError(String::New("buffer size must be a Number"));
               return ThrowException(exception);
            }
         }
      }
      
      Flater *self = new Flater();
      self->Wrap(args.This());

      self->isInflater = isInflater;

      self->input = NULL;
      self->output_length = 0;
      self->output = NULL;
      self->finished = false;

      self->strm.zalloc = Z_NULL;
      self->strm.zfree = Z_NULL;
      self->strm.opaque = Z_NULL;
      self->strm.avail_in = 0;
      self->strm.next_in = Z_NULL;
      self->output_chunk_size = output_chunk_size;
      
      int r;
      if (self->isInflater) {
         r = inflateInit2(&(self->strm), windowBits);
      }
      else
      {
         r = deflateInit2(&(self->strm), level, Z_DEFLATED, windowBits, memLevel, strategy);
      }

      if (r < 0) {
         return GetZError(r);
      }
      
      return args.This();
   }
   
   static Handle<Value> SetInput(const Arguments& args) {
      Flater *self = ObjectWrap::Unwrap<Flater>(args.This());
      HandleScope scope;
      
      Local<Object> in = args[0]->ToObject();
      ssize_t length = Buffer::Length(in);

      // copy the input buffer, because it can be kept for several deflate() calls
      self->input = (char*)realloc(self->input, length);
      
      if (self->input == NULL) {
          return GetZError(Z_MEM_ERROR);
      }
      
      memcpy(self->input, Buffer::Data(in), length);

      self->strm.avail_in = length;
      self->strm.next_in = (Bytef*) self->input;
      
      if (self->output == NULL || self->output_length == self->output_chunk_size) {
         self->strm.avail_out = self->output_chunk_size;
         self->output = (char*) malloc(self->output_chunk_size);
         
         if (self->output == NULL) {
            return GetZError(Z_MEM_ERROR);
         }
         
         self->strm.next_out = (Bytef*) self->output;
      }
      
      return scope.Close(Undefined());
   }
   
   static Handle<Value> Deflate(const Arguments& args) {
      Flater *self = ObjectWrap::Unwrap<Flater>(args.This());
      HandleScope scope;
      
      if (self->isInflater) {
         return ThrowException(Exception::Error(String::New("invalid when inflate = true")));
      }

      int r = deflate(&(self->strm), Z_NO_FLUSH);
      self->status = r;
      self->output_length = self->output_chunk_size - self->strm.avail_out;
      
      if (r < 0) {
         return GetZError(r);
      }
      
      bool isOutputBufferFull = self->output_length == self->output_chunk_size;
      return scope.Close(Boolean::New(isOutputBufferFull));
   }
   
   static Handle<Value> Finish(const Arguments& args) {
      Flater *self = ObjectWrap::Unwrap<Flater>(args.This());
      HandleScope scope;
      
      if (self->isInflater) {
         return ThrowException(Exception::Error(String::New("invalid when inflate = true")));
      }
      
      if (self->finished) {
         return scope.Close(False());
      }
      
      self->strm.avail_in = 0;
      self->strm.next_in = NULL;

      int r = deflate(&(self->strm), Z_FINISH);
      self->status = r;
      
      self->output_length = self->output_chunk_size - self->strm.avail_out;
      
      if (r == Z_STREAM_END) {
         deflateEnd(&(self->strm));
         self->finished = true;
      }
      
      if (r < 0) {
         return GetZError(r);
      }
      
      return scope.Close(True());
   }
   
   static Handle<Value> Inflate(const Arguments& args) {
      Flater *self = ObjectWrap::Unwrap<Flater>(args.This());
      HandleScope scope;

      if (!self->isInflater) {
         return ThrowException(Exception::Error(String::New("invalid when inflate = false")));
      }
      
      if (self->finished) {
         return scope.Close(False());
      }

      int r = inflate(&(self->strm), Z_NO_FLUSH);
      self->status = r;
      self->output_length = self->output_chunk_size - self->strm.avail_out;

      if (r == Z_STREAM_END) {
         inflateEnd(&(self->strm));
         self->finished = true;
      }

      if (r < 0) {
         return GetZError(r);
      }

      if (self->finished) {
         return scope.Close(True());
      }
      else {
         return scope.Close(Boolean::New(self->output_length == self->output_chunk_size));
      }
   }
   
   static Handle<Value> GetOutput(const Arguments& args) {
      Flater *self = ObjectWrap::Unwrap<Flater>(args.This());
      HandleScope scope;
      
      Buffer* slowBuffer = Buffer::New(self->output, self->output_length);
      
      // reset output
      self->strm.avail_out = self->output_chunk_size;
      self->strm.next_out = (Bytef*) self->output;
      
      if (self->finished) {
         free(self->output);
      }
      
      Local<Object> globalObj = Context::GetCurrent()->Global();
      Local<Function> bufferConstructor = Local<Function>::Cast(globalObj->Get(String::New("Buffer")));
      Handle<Value> constructorArgs[3] = { slowBuffer->handle_, Integer::New(self->output_length), Integer::New(0) };
      Local<Object> jsBuffer = bufferConstructor->NewInstance(3, constructorArgs);
      
      return scope.Close(jsBuffer);
   }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////

static Handle<Value> GetVersion(const Arguments &args) {
   const char* version = zlibVersion();
   return String::New(version);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

static Handle<Value> OnePassDeflate(const Arguments& args) {
   HandleScope scope;
   
   int level = Z_DEFAULT_COMPRESSION;
   int windowBits = 16 + MAX_WBITS; // gzip
   int memLevel = 8;
   int strategy = Z_DEFAULT_STRATEGY;
   
   int idx = 1;
   
   if (args.Length() > 0) {
      if(args[idx+0]->IsNumber()) {
         level = args[idx+0]->Int32Value();        
         if (level < 0 || level > 9) {
            Local<Value> exception = Exception::Error(String::New("level must be between 0 and 9"));
            return ThrowException(exception);
         }
      }
      else if (args[idx+0]->IsString()) {
         char* strLevel = *String::AsciiValue(args[idx+0]->ToString());
         
         if (strcmp(strLevel, "gzip") == 0) {
            windowBits = 16 + MAX_WBITS;
         }
         else if (strcmp(strLevel, "zlib") == 0) {
            windowBits = MAX_WBITS;
         }
         else if (strcmp(strLevel, "deflate") == 0) {
            windowBits = -MAX_WBITS;
         }
         else {
            Local<Value> exception = Exception::TypeError(String::New("bad deflate kind"));
            return ThrowException(exception);
         }
      }
      else if (args[idx+0]->IsUndefined()) {
      }
      else {
         Local<Value> exception = Exception::TypeError(String::New("expected a Number or String"));
         return ThrowException(exception);
      }
      
      if (args.Length() > 1) {
         if(args[idx+1]->IsNumber()) {
            level = args[idx+1]->Int32Value();        
            if (level < 0 || level > 9) {
               Local<Value> exception = Exception::Error(String::New("level must be between 0 and 9"));
               return ThrowException(exception);
            }
         }
         else if (args[idx+1]->IsUndefined()) {
         }
         else {
            Local<Value> exception = Exception::TypeError(String::New("expected a Number"));
            return ThrowException(exception);
         }
      }
   }
   else {
      Local<Value> exception = Exception::TypeError(String::New("invalid arguments"));
      return ThrowException(exception);
   }
   
   if (!Buffer::HasInstance(args[0])) {
      Local<Value> exception = Exception::TypeError(String::New("expected Buffer"));
      return ThrowException(exception);
   }
   
   Local<Object> inBuff = args[0]->ToObject();
   char* in = Buffer::Data(inBuff);
   size_t in_length = Buffer::Length(inBuff);

   z_stream strm;
   strm.zalloc = Z_NULL;
   strm.zfree = Z_NULL;
   strm.opaque = Z_NULL;
   int r =  deflateInit2(&strm, level, Z_DEFLATED, windowBits, memLevel, strategy);
      
   if (r < 0) {
      return GetZError(r);
   }
   
   // deflate
   strm.avail_in = in_length;
   strm.next_in = (Bytef*) in;
   
   uLong bound = deflateBound(&strm, strm.avail_in);
   
   char* out = (char*) malloc(bound);
   
   if (out == NULL) {
      return GetZError(Z_MEM_ERROR);
   }
   
   strm.avail_out = bound;
   strm.next_out = (Bytef*) out;
          
   r = deflate(&strm, Z_FINISH);
   
   int out_length = bound - strm.avail_out;
   
   deflateEnd(&strm);

   if (r < 0) {
      return GetZError(r);
   }
   
   // output
   Buffer* slowBuffer = Buffer::New(out, out_length);
   free(out);

   Local<Object> globalObj = Context::GetCurrent()->Global();
   Local<Function> bufferConstructor = Local<Function>::Cast(globalObj->Get(String::New("Buffer")));
   Handle<Value> constructorArgs[3] = { slowBuffer->handle_, Integer::New(out_length), Integer::New(0) };
   Local<Object> jsBuffer = bufferConstructor->NewInstance(3, constructorArgs);

   return scope.Close(jsBuffer);
}
   
static Handle<Value> OnePassInflate(const Arguments& args) {
   HandleScope scope;
   
   int windowBits = 16 + MAX_WBITS; // gzip
   
   int idx = 1;
   
   if (args.Length() > 0) {
      if (args[idx+0]->IsString()) {
         char* strLevel = *String::AsciiValue(args[idx+0]->ToString());
         
         if (strcmp(strLevel, "gzip") == 0) {
            windowBits = 16 + MAX_WBITS;
         }
         else if (strcmp(strLevel, "zlib") == 0) {
            windowBits = MAX_WBITS;
         }
         else if (strcmp(strLevel, "deflate") == 0) {
            windowBits = -MAX_WBITS;
         }
         else {
            Local<Value> exception = Exception::TypeError(String::New("bad deflate kind"));
            return ThrowException(exception);
         }
      }
      else if (args[idx+0]->IsUndefined()) {
      }
      else {
         Local<Value> exception = Exception::TypeError(String::New("expected a String"));
         return ThrowException(exception);
      }
   }
   else {
      Local<Value> exception = Exception::TypeError(String::New("invalid arguments"));
      return ThrowException(exception);
   }
   
   if (!Buffer::HasInstance(args[0])) {
      Local<Value> exception = Exception::TypeError(String::New("expected Buffer"));
      return ThrowException(exception);
   }
   
   Local<Object> inBuff = args[0]->ToObject();
   char* in = Buffer::Data(inBuff);
   size_t in_length = Buffer::Length(inBuff);

   if (in_length == 0) {
      Local<Value> exception = Exception::TypeError(String::New("Buffer length must be greater than zero"));
      return ThrowException(exception);
   }

   z_stream strm;
   strm.zalloc = Z_NULL;
   strm.zfree = Z_NULL;
   strm.opaque = Z_NULL;
   strm.avail_in = 0;
   strm.next_in = Z_NULL;
   int r = inflateInit2(&strm, windowBits);
      
   if (r < 0) {
      return GetZError(r);
   }
   
   // deflate
   strm.avail_in = in_length;
   strm.next_in = (Bytef*) in;
   
   // urgh, we don't know the buffer size (Q: is it in the gzip header?)
   uLong bound = 131072; // 128K
   
   char* out = (char*) malloc(bound);
   
   if (out == NULL) {
      return GetZError(Z_MEM_ERROR);
   }
   
   strm.avail_out = bound;
   strm.next_out = (Bytef*) out;
          
   r = inflate(&strm, Z_FINISH);
   
   while (r == Z_BUF_ERROR) {
      bound = bound * 2;
      size_t len = (char*)strm.next_out - out;
      
      out = (char*) realloc(out, bound);

      if (out == NULL) {
         return GetZError(Z_MEM_ERROR);
      }
      
      strm.avail_out = bound - len;
      strm.next_out = (Bytef*) (out + len);
      
      r = inflate(&strm, Z_FINISH);
   }
   
   if (r < 0) {
      return GetZError(r);
   }
   
   int out_length = bound - strm.avail_out;
   
   inflateEnd(&strm);
   
   // output
   Buffer* slowBuffer = Buffer::New(out, out_length);
   free(out);

   Local<Object> globalObj = Context::GetCurrent()->Global();
   Local<Function> bufferConstructor = Local<Function>::Cast(globalObj->Get(String::New("Buffer")));
   Handle<Value> constructorArgs[3] = { slowBuffer->handle_, Integer::New(out_length), Integer::New(0) };
   Local<Object> jsBuffer = bufferConstructor->NewInstance(3, constructorArgs);

   return scope.Close(jsBuffer);
}
   
////////////////////////////////////////////////////////////////////////////////////////////////////////

extern "C" {
   void init (Handle<Object> target) 
   {
     Flater::Init(target);
     
     NODE_SET_METHOD(target, "version", GetVersion);
     NODE_SET_METHOD(target, "deflateSync", OnePassDeflate);
     NODE_SET_METHOD(target, "inflateSync", OnePassInflate);
     // deprecated:
     NODE_SET_METHOD(target, "deflate", OnePassDeflate);
     NODE_SET_METHOD(target, "inflate", OnePassInflate);
   }
   
   NODE_MODULE(compress, init);
}