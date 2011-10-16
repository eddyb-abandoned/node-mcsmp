import Options
from os import unlink, symlink, popen
from os.path import exists
from shutil import copy2 as copy

TARGET = 'deflate-bindings'
TARGET_FILE = '%s.node' % TARGET
built = 'build/default/%s' % TARGET_FILE
dest = 'lib/%s' % TARGET_FILE

def set_options(opt):
  opt.tool_options("compiler_cxx")
  opt.add_option('--debug', dest='debug', action='store_true', default=False)
   
def configure(conf):
  conf.check_tool("compiler_cxx")
  conf.check_tool("node_addon")
  conf.check(lib='z', libpath=['/usr/lib', '/usr/local/lib'], uselib_store='ZLIB', mandatory=True)
  
  conf.env.DEFINES = []

  if Options.options.debug:
    conf.env.DEFINES += [ 'DEBUG' ]
    conf.env.CXXFLAGS = [ '-O0', '-g3' ]
  else:
    conf.env.CXXFLAGS = [ '-O3' ]
  

def build(bld):
  obj = bld.new_task_gen("cxx", "shlib", "node_addon")
  #obj.cxxflags = ["-D_FILE_OFFSET_BITS=64", "-D_LARGEFILE_SOURCE", "-Wall"]
  obj.target = TARGET
  obj.source = "src/deflate.cc"
  obj.uselib = "ZLIB"
  obj.defines = bld.env.DEFINES
  
def shutdown():
 if Options.commands['clean']:
     if exists(TARGET_FILE):
       unlink(TARGET_FILE)
     if exists(dest):
       unlink(dest)
 else:
   if exists(built):
     copy(built, dest)