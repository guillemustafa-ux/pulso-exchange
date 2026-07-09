# Custodial vs. non-custodial: quién controla tus fondos

"Not your keys, not your coins" es probablemente la frase más repetida en cripto, y resume la diferencia central entre dos modelos. Un servicio **custodial** (un exchange centralizado como Binance, o una fintech que ofrece cripto) guarda las claves privadas por vos: vos ves un saldo en una interfaz, pero técnicamente esos fondos están en wallets controladas por la empresa. Es cómodo — hay recuperación de cuenta, soporte al cliente, no hay riesgo de perder una seed phrase — pero implica confiar en que la empresa sea solvente, honesta y esté bien gestionada operativamente.

Esa confianza puede fallar, y la historia reciente tiene ejemplos concretos: **Mt. Gox** (2014) perdió cerca de 850,000 BTC de sus usuarios por un hackeo no detectado a tiempo, y el caso sigue resolviéndose judicialmente más de una década después. **FTX** (noviembre 2022) colapsó cuando se descubrió que había usado fondos de clientes para cubrir posiciones de riesgo de una firma relacionada (Alameda Research), dejando a millones de usuarios sin acceso a fondos que creían "seguros" en el exchange. En ambos casos, el problema no fue la tecnología blockchain: fue que los fondos nunca estuvieron realmente bajo el control de sus dueños, sino de una empresa que falló.

Un modelo **non-custodial** invierte esa relación: las claves privadas viven en tu propia wallet (MetaMask, Rainbow, una hardware wallet), y ninguna interfaz puede mover tus fondos sin que vos firmes cada transacción individualmente. Esto elimina el riesgo de que un tercero quiebre, sea hackeado o actúe de mala fe con tus fondos — pero traslada la responsabilidad completa a vos: si perdés tu seed phrase o wallet sin backup, no hay soporte técnico que te la pueda recuperar, y si te engañan para firmar una transacción maliciosa, la transacción es igual de válida e irreversible que cualquier otra.

PULSO está construido explícitamente como non-custodial: al conectar tu wallet, el módulo de Staking arma las transacciones pero sos vos quien las firma y controla en todo momento — la plataforma nunca tiene custodia de tus fondos. Elegir entre custodial y non-custodial no es "cuál es mejor" en abstracto, sino qué trade-off preferís para cada monto y cada uso: comodidad y soporte de un lado, control total y responsabilidad total del otro.

<!-- quiz -->
```json
[
  {
    "question": "¿Qué significa que un exchange sea 'custodial'?",
    "options": [
      "Que el usuario controla directamente sus claves privadas",
      "Que la empresa guarda las claves privadas y controla técnicamente los fondos que el usuario ve como saldo",
      "Que solo se puede usar en testnets",
      "Que no cobra comisiones"
    ],
    "correctIndex": 1,
    "explanation": "En un modelo custodial, el saldo que ves en la interfaz representa fondos que técnicamente controla la empresa."
  },
  {
    "question": "¿Qué mostró el colapso de FTX en noviembre de 2022?",
    "options": [
      "Que la blockchain de Bitcoin fue hackeada",
      "Que el riesgo de un exchange custodial es la solvencia y honestidad de la empresa, no la tecnología blockchain en sí",
      "Que todos los exchanges centralizados van a colapsar en 2026",
      "Que las wallets non-custodial también perdieron fondos ese día"
    ],
    "correctIndex": 1,
    "explanation": "FTX usó fondos de clientes de forma indebida: el problema fue de gestión y confianza, no un fallo de la blockchain."
  },
  {
    "question": "¿Cuál es la contrapartida de usar una wallet non-custodial?",
    "options": [
      "No tiene ninguna desventaja",
      "Que la responsabilidad de proteger la seed y validar cada transacción recae completamente en el usuario, sin soporte que la recupere",
      "Que las transacciones se pueden revertir fácilmente",
      "Que necesita aprobación de un exchange para operar"
    ],
    "correctIndex": 1,
    "explanation": "El non-custodial elimina el riesgo de terceros pero traslada toda la responsabilidad (y sus errores) al propio usuario."
  },
  {
    "question": "¿Cómo opera PULSO respecto a la custodia de fondos?",
    "options": [
      "Guarda las claves privadas de los usuarios en sus servidores",
      "Es non-custodial: arma las transacciones pero el usuario las firma y controla desde su propia wallet",
      "Requiere depositar fondos en una cuenta de PULSO antes de operar",
      "Solo permite operar con custodia de un tercero regulado"
    ],
    "correctIndex": 1,
    "explanation": "PULSO nunca tiene custodia de los fondos: cada acción del módulo de Staking requiere la firma del usuario en su propia wallet."
  }
]
```
