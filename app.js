const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors'); // Asegúrate de que esta línea esté presente
const logger = require('morgan');

const indexRouter = require('./routes/index');
const clientesRouter = require('./routes/clientes');
const ClienteService = require('./services/cliente-service');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// =========================================================
// FIX CRÍTICO: Configuración de CORS para Load Balancer y Frontend de OCI
// =========================================================

// 1. Lista de Orígenes Permitidos (Incluye el frontend de OCI)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // ¡NUEVO ORIGEN AÑADIDO PARA EL FRONTEND DE OCI!
  'https://objectstorage.sa-santiago-1.oraclecloud.com',
];

// 2. Opciones de CORS con Lógica Condicional
const corsOptions = {
  origin: (origin, callback) => {
    // La condición clave es `!origin`. Esto permite peticiones sin encabezado
    // 'Origin' (como las que hace el Load Balancer para el Health Check).
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};

// 3. Aplicar la configuración completa
app.use(cors(corsOptions));

// =========================================================
// FIN DEL FIX
// =========================================================

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/clientes', clientesRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

ClienteService.init().then((clienteService) => {
  app.set('clienteService', clienteService);
});

process.on('exit', () => {
  app.get('clienteService').closePool();
});

module.exports = app;