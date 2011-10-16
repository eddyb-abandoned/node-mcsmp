var deflate = require('../lib/deflate'),
    fs = require('fs'),
    path = require('path');

function testOnePassDeflate(format, extension, test) {
  test.expect(1);

  var inPath = path.join(__dirname, 'andromeda.bmp');
  var outPath = path.join(__dirname, 'temp.' + extension);
  
  if (path.existsSync(outPath)) {
    fs.unlinkSync(outPath);
  }
  
  fs.writeFileSync(outPath, deflate.deflateSync(fs.readFileSync(inPath), format));
  
  validateDeflate(test, extension);
  test.done();
}

function testStreamingDeflate(format, extension, test) {
  test.expect(1);

  var input = fs.createReadStream(path.join(__dirname, 'andromeda.bmp'));
  var outPath = path.join(__dirname, 'temp.' + extension);
  
  if (path.existsSync(outPath)) {
    fs.unlinkSync(outPath);
  }
  
  var output = fs.createWriteStream(outPath);
  
  var ds = deflate.createDeflateStream(input, format);
  ds.pipe(output);

  input.on('close', function() {
    validateDeflate(test, extension);
    test.done();
  });
}

function validateDeflate(test, extension, inflate) {
  var correct = fs.readFileSync(path.join(__dirname, 'andromeda.bmp.' + extension));
  var deflated = fs.readFileSync(path.join(__dirname, 'temp.' + extension));

  var failed = false;

  for (var i = 0; i < correct.length; i++) {
    if (deflated[i] != correct[i]) {
      test.equal(deflated[i], correct[i], 'at offset: ' + i);
      failed = true;
      break;
    }
  }

  if (!failed) {
    test.ok(true);  
  }
}

function testOnePassInflate(format, extension, test) {
  test.expect(1);
  
  var inPath = path.join(__dirname, 'andromeda.bmp.' + extension);
  var outPath = path.join(__dirname, 'temp_' + extension + '.bmp');
  
  if (path.existsSync(outPath)) {
    fs.unlinkSync(outPath);
  }
  
  fs.writeFileSync(outPath, deflate.inflateSync(fs.readFileSync(inPath), format));
  
  validateInflate(test, extension);
  test.done();
}


function testStreamingInflate(format, extension, test) {
  test.expect(1);
  
  var input = fs.createReadStream(path.join(__dirname, 'andromeda.bmp.' + extension));
  
  var outPath = path.join(__dirname, 'temp_' + extension + '.bmp');
  
  if (path.existsSync(outPath)) {
    fs.unlinkSync(outPath);
  }
  
  var output = fs.createWriteStream(outPath);
  
  var ds = deflate.createInflateStream(input, format);
  ds.pipe(output);

  input.on('close', function() {
    validateInflate(test, extension);
    test.done();
  });
}

function validateInflate(test, extension, inflate) {
  var correct = fs.readFileSync(path.join(__dirname, 'andromeda.bmp'));
  var inflated = fs.readFileSync(path.join(__dirname, 'temp_' + extension + '.bmp'));

  var failed = false;

  for (var i = 0; i < correct.length; i++) {
    if (inflated[i] != correct[i]) {
      test.equal(inflated[i], correct[i], 'at offset: ' + i);
      failed = true;
      break;
    }
  }

  if (!failed) {
    test.ok(true);  
  }
}

exports['GZIP deflate'] = function(test) {
    testOnePassDeflate('gzip', 'gz', test);
};

exports['ZLIB deflate'] = function(test) {
    testOnePassDeflate('zlib', 'z', test);
};

exports['DEFLATE deflate'] = function(test) {
    testOnePassDeflate('deflate', 'deflate', test);
};

exports['streaming GZIP deflate'] = function(test) {
    testStreamingDeflate('gzip', 'gz', test);
};

exports['streaming ZLIB deflate'] = function(test) {
    testStreamingDeflate('zlib', 'z', test);
};

exports['streaming DEFLATE deflate'] = function(test) {
    testStreamingDeflate('deflate', 'deflate', test);
};

exports['GZIP inflate'] = function(test) {
    testOnePassInflate('gzip', 'gz', test);
};

exports['ZLIB inflate'] = function(test) {
    testOnePassInflate('zlib', 'z', test);
};

exports['DEFLATE inflate'] = function(test) {
    testOnePassInflate('deflate', 'deflate', test);
};

exports['streaming GZIP inflate'] = function(test) {
    testStreamingInflate('gzip', 'gz', test);
};

exports['streaming ZLIB inflate'] = function(test) {
    testStreamingInflate('zlib', 'z', test);
};

exports['streaming DEFLATE inflate'] = function(test) {
    testStreamingInflate('deflate', 'deflate', test);
};