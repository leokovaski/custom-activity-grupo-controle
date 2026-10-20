'use strict';

/**
 * Custom Activity "Grupo Controle" — comunicação com o Journey Builder via Postmonger.
 * Fluxo: ready -> initActivity + requestedInteraction
 *        -> (usuário escolhe o tipo) -> clickedNext -> updateActivity
 */
if (typeof Postmonger === 'undefined') {
  document.body.innerHTML =
    '<p style="padding:24px;color:#c23934;font-family:sans-serif">' +
    'Erro: postmonger.min.js não carregou. Verifique se o arquivo existe em /js/.</p>';
  throw new Error('Postmonger não carregado');
}

var connection = new Postmonger.Session();
var activity = null;
var journeyName = '';
var journeyId = '';
var activityKey = '';   // ex.: "REST-2" — identifica esta activity dentro da jornada
var step = '';          // posição (1-based) desta activity entre as activities da jornada

$onReady();

function $onReady() {
  connection.on('initActivity', onInitActivity);
  connection.on('clickedNext', onClickedNext);
  connection.on('requestedInteraction', onRequestedInteraction);

  connection.trigger('ready');
  connection.trigger('requestInteraction');

  document.getElementById('tipo').addEventListener('change', validateForm);
  validateForm();
}

function val(id) {
  return document.getElementById(id).value.trim();
}

function validateForm() {
  connection.trigger('updateButton', {
    button: 'next', text: 'done', visible: true, enabled: Boolean(val('tipo'))
  });
}

function renderStep() {
  var el = document.getElementById('stepView');
  if (!activityKey) { el.value = '(não disponível)'; return; }
  el.value = step ? 'Step ' + step + ' (' + activityKey + ')' : activityKey;
}

function onRequestedInteraction(interaction) {
  if (!interaction) return;
  journeyName = interaction.name || '';
  journeyId = interaction.id || '';
  document.getElementById('journeyNameView').value = journeyName || '(não disponível)';

  // Step = posição desta activity na lista de activities da jornada
  var acts = interaction.activities || [];
  for (var i = 0; i < acts.length; i++) {
    if (acts[i].key === activityKey) { step = String(i + 1); break; }
  }
  renderStep();
}

function onInitActivity(payload) {
  activity = payload || {};
  activityKey = activity.key || '';

  var inArguments =
    activity.arguments &&
    activity.arguments.execute &&
    activity.arguments.execute.inArguments
      ? activity.arguments.execute.inArguments
      : [];

  var args = inArguments.reduce(function (acc, arg) {
    Object.keys(arg).forEach(function (k) { acc[k] = arg[k]; });
    return acc;
  }, {});

  if (args.tipo) document.getElementById('tipo').value = args.tipo;
  renderStep();
  validateForm();
}

function onClickedNext() {
  activity.arguments = activity.arguments || {};
  activity.arguments.execute = activity.arguments.execute || {};

  activity.arguments.execute.inArguments = [
    { contactKey: '{{Contact.Key}}' },
    { tipo: val('tipo') },
    { journeyName: journeyName },
    { journeyId: journeyId },
    { activityKey: activityKey },
    { step: step }
  ];

  activity.metaData = activity.metaData || {};
  activity.metaData.isConfigured = true;

  connection.trigger('updateActivity', activity);
}
