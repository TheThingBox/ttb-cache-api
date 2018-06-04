'use strict';

var fs    = require("fs"),
  path    = require("path"),
  mkdirp  = require("mkdirp"),
  fsUtils = require("nodejs-fs-utils");

module.exports = function cache(cacheSize, cacheIndexFile, cacheLocation) {
  if(!dirExists(cacheLocation)) mkdirp.sync(cacheLocation);
  if(!dirExists(path.dirname(cacheIndexFile))) mkdirp.sync(path.dirname(cacheIndexFile));
  if(!dirExists(cacheIndexFile)) fs.writeFileSync(cacheIndexFile, '[]', 'utf8');

  this.size      = cacheSize;
  this.indexFile = cacheIndexFile;
  this.location  = cacheLocation;
  this.check     = check;
  this.add       = add;
}

function check(fileToAdd){
  var cacheArray  = JSON.parse(fs.readFileSync(this.indexFile, 'utf8')),
    testKey     = keyExists(cacheArray, fileToAdd),
    result      = {};

  if(testKey) {
    cacheArray[testKey].usage++;
    fs.writeFileSync(this.indexFile, JSON.stringify(cacheArray, null, 4), 'utf8');
    result.exist = true;
    result.path  = cacheArray[testKey].path;
  } else {
    result.exist = false;
    result.path = fileToAdd.path;
  }
  return result;
}

function add(fileToAdd) {
  /* fileToAdd example :
      {
          "path": "/root/userdir/audio/01.mp3",
          "key": "helene-testphrase",
      }
  */
  fileToAdd.usage = 1;
  fileToAdd.creation = Date();

  var cacheArray = JSON.parse(fs.readFileSync(this.indexFile, 'utf8')),
    testKey      = keyExists(cacheArray, fileToAdd),
    currentSize  = fsUtils.fsizeSync(this.location),
    result       = null;

  if(!testKey){
    if(this.size > currentSize) {
      cacheArray.push(fileToAdd);
      fs.writeFileSync(this.indexFile, JSON.stringify(cacheArray, null, 4), 'utf8');
    } else {
      do {
        var minUsage      = lowestUsage(cacheArray);
        var multiMinUsage = multipleCase(cacheArray, minUsage);
        var fileToDelete  = oldestFile(cacheArray, multiMinUsage);

        fs.unlinkSync(fileToDelete.path); //remove fileToDelete
        cacheArray = cacheArray.slice(fileToDelete.index, 1);
        fs.writeFileSync(this.indexFile, JSON.stringify(cacheArray, null, 4), 'utf8');

      } while(this.size < fsUtils.fsizeSync(this.location) && cacheArray.length < 0);
      cacheArray.push(fileToAdd);
      fs.writeFileSync(this.indexFile, JSON.stringify(cacheArray, null, 4), 'utf8');
    }
    result = fileToAdd.path;
  }
  return result;
}

function dirExists(d) { //check if a folder already exist
  try {
    fs.statSync(d);
    return true;
  }
  catch(e) {
    return false;
  }
}

function keyExists(array, file) { //check if a key exist
  var test = false;
  for(var i in array){
    if(array[i].key === file.key) {
      test = i;
    }
  }
  return test;
}

function lowestUsage(array) { //check the file that have the lowest usage
  var lowest  = Number.POSITIVE_INFINITY,
    tmp;
  for(var i in array){
    tmp = array[i].usage;
    if(tmp < lowest) {
      lowest = tmp;
    }
  }
  return lowest;
}

function multipleCase(array, value){ //check if a value is many times in array
  var index = [];
  for(var i in array){
    if(array[i].usage === value) {
      index.push(i);
    }
  }
  return index;
}

function oldestFile(array, usage) { //check the oldest file
  var lowest = Date(),
    path,
    tmp,
    index,
    tmpIndex;
  if(usage.length === 1){
    index = usage[0];
    path  = array[index].path;
  } else {
    for(var i in usage){
      tmpIndex = usage[i];
      tmp = array[tmpIndex].creation;
      if(tmp < lowest) {
        lowest = array[tmpIndex].creation;
        path   = array[tmpIndex].path;
        index  = tmpIndex;
      }
    }
  }
  var out = {
    path: path,
    index: index
  };
  return out;
}
