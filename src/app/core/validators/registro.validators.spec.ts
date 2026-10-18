import { FormControl } from '@angular/forms';
import { correoValido, paisEnLista, soloDigitos } from './registro.validators';

describe('registro.validators', () => {
  describe('correoValido', () => {
    it.each(['ana@example.com', 'ana.perez+solventa@mail.co', 'a@sub.dominio.com.co'])(
      'acepta %s',
      (correo) => {
        expect(correoValido(new FormControl(correo))).toBeNull();
      },
    );

    it.each([
      'ana',
      'ana@dominio',
      'ana@.com',
      '@dominio.com',
      'ana @dominio.com',
      'ana@dominio.c',
    ])('rechaza %s', (correo) => {
      expect(correoValido(new FormControl(correo))).toEqual({ correoInvalido: true });
    });

    it('deja la obligatoriedad a Validators.required', () => {
      expect(correoValido(new FormControl(''))).toBeNull();
    });
  });

  describe('soloDigitos', () => {
    const cedula = soloDigitos(5, 10);

    it.each(['12345', '1020304050'])('acepta %s', (valor) => {
      expect(cedula(new FormControl(valor))).toBeNull();
    });

    it.each(['1234', '12345678901', '12a45', '123 45', '+57300'])('rechaza %s', (valor) => {
      expect(cedula(new FormControl(valor))).toEqual({ digitosInvalidos: { min: 5, max: 10 } });
    });
  });

  describe('paisEnLista', () => {
    it('acepta un país de la lista', () => {
      expect(paisEnLista(new FormControl('Colombia'))).toBeNull();
    });

    it('rechaza un texto que no es un país de la lista', () => {
      expect(paisEnLista(new FormControl('Colomb'))).toEqual({ paisNoListado: true });
    });
  });
});
