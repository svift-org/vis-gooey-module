var sass = require('node-sass'),
  fs = require('fs')

let files = [
  __dirname + '/node_modules/svift-vis/style.scss',
  __dirname + '/style.scss'
]

let content = ''
files.forEach(function(file){
  if (fs.existsSync(file)) {
    content += fs.readFileSync(file, 'utf8')
  }else{
    console.log('missing', file)
  }
})

fs.writeFileSync( 
  __dirname + '/tests/style.css', 
  sass.renderSync({
    data:content,
    outputStyle: 'compressed' 
  }).css, 
  'utf8' 
)