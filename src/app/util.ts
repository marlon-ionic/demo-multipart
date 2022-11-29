export const isStringOrNumber = (o: any): boolean => !isNaN(parseInt(o, 10)) || typeof(o) === 'string';
