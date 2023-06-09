const express = require('express');
const logger = require('morgan');
const cors = require('cors');

const {
  authRouter,
  noticeRouter,
  newsRouter,
  partnersRouter,
  petsRouter,
} = require('./routes');

const app = express();

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const formatsLogger = app.get('env') === 'development' ? 'dev' : 'short';

app.use(logger(formatsLogger));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/users', authRouter);
app.use('/pets', petsRouter);
app.use('/notices', noticeRouter);
app.use('/news', newsRouter);
app.use('/partners', partnersRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, req, res, next) => {
  const { status = 500, message = 'Server error' } = err;
  res.status(status).json({ message });
});

module.exports = app;
