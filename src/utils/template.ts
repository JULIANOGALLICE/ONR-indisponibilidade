export function generateCustomText(template: string, data: {
  Documento: string;
  Nome: string;
  Hash: string;
  DataHora: string;
  QtdOrdens: string | number;
  Protocolos: string;
}): string {
  if (!template) return '';
  
  let text = template;
  text = text.replace(/{Documento}/gi, data.Documento || '');
  text = text.replace(/{Nome}/gi, data.Nome || '');
  text = text.replace(/{Hash}/gi, data.Hash || '');
  text = text.replace(/{DataHora}/gi, data.DataHora || '');
  text = text.replace(/{QtdOrdens}/gi, String(data.QtdOrdens || '0'));
  text = text.replace(/{Protocolos}/gi, data.Protocolos || '');
  
  return text;
}
