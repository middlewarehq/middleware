import { parseLogLine } from '../logFormatter';

describe('Should correctly parse  logs', () => {
  it('Should correctly parse a  log line', () => {
    const rawLog =
      '[2024-10-08 04:21:42 +0000] [164] [INFO] Booting worker with pid: 164';
    const expected = {
      timestamp: '2024-10-08 04:21:42 +0000',
      logLevel: 'INFO',
      message: 'Booting worker with pid: 164'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('Should correctly parse a  log line with different log level', () => {
    const rawLog =
      '[2024-10-08 04:21:42 +0000] [164] [ERROR] Booting worker with pid: 164';
    const expected = {
      timestamp: '2024-10-08 04:21:42 +0000',
      logLevel: 'ERROR',
      message: 'Booting worker with pid: 164'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('Should correctly parse a  with without log level', () => {
    const rawLog =
      '127.0.0.1 - - [08/Oct/2024:04:25:26 +0000] "GET / HTTP/1.1" 200 26 "-" "axios/0.26.1"';
    const expected = {
      timestamp: '08/Oct/2024:04:25:26 +0000',
      logLevel: 'INFO',
      message: 'GET / 200 26 "-" "axios/0.26.1"',
      ip: '127.0.0.1'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('Should correctly parse a log line without timestamp', () => {
    const rawLog =
      '[INFO] Data sync for sync_org_incidents completed successfully';
    const expected = {
      timestamp: '',
      logLevel: 'INFO',
      message: 'Data sync for sync_org_incidents completed successfully'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('Should correctly parse a  log line with different date format : [08/Oct/2024:04:25:16 +0000]', () => {
    const rawLog =
      '127.0.0.1 - - [08/Oct/2024:04:25:16 +0000] "GET / HTTP/1.1" 200 26 "-" "axios/0.26.1"';
    const expected = {
      ip: '127.0.0.1',
      logLevel: 'INFO',
      message: 'GET / 200 26 "-" "axios/0.26.1"',
      timestamp: '08/Oct/2024:04:25:16 +0000'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('Should correctly parse a  log line with different date format : 2024-10-08 04:21:40.288 UTC', () => {
    const rawLog =
      '2024-10-08 04:21:40.288 UTC [49] LOG: starting PostgreSQL 15.8 (Debian 15.8-0+deb12u1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit';
    const expected = {
      timestamp: '2024-10-08 04:21:40.288 UTC',
      logLevel: 'LOG',
      message:
        'starting PostgreSQL 15.8 (Debian 15.8-0+deb12u1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('Should correctly parse a  log line with different date format : 08 Oct 2024 04:21:40.149', () => {
    const rawLog = `51:M 08 Oct 2024 04:21:40.149 # Server initialized`;
    const expected = {
      role: '51:M',
      timestamp: '08 Oct 2024 04:21:40.149',
      logLevel: 'WARNING',
      message: 'Server initialized'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('POSTGRES : Should parse postgres log line', () => {
    const rawLog = `2024-09-27 12:14:45.280 UTC [56] LOG:  checkpoint starting: time`;
    const expected = {
      timestamp: '2024-09-27 12:14:45.280 UTC',
      logLevel: 'LOG',
      message: 'checkpoint starting: time'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('POSTGRES : Should parse postgres log line with different log level : ERROR', () => {
    const rawLog = `2024-09-24 07:25:08.658 UTC [160] ERROR:  duplicate key value violates unique constraint "languages_pkey"`;
    const expected = {
      timestamp: '2024-09-24 07:25:08.658 UTC',
      logLevel: 'ERROR',
      message: 'duplicate key value violates unique constraint "languages_pkey"'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('POSTGRES : Should parse postgres log line with different log level : STATEMENT', () => {
    const rawLog = `2024-09-24 07:25:07.487 UTC [159] STATEMENT:  INSERT INTO "public"."Language" ("createdAt","id","judge0Id","updatedAt","name") VALUES ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10)`;
    const expected = {
      timestamp: '2024-09-24 07:25:07.487 UTC',
      logLevel: 'STATEMENT',
      message:
        'INSERT INTO "public"."Language" ("createdAt","id","judge0Id","updatedAt","name") VALUES ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10)'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('POSTGRES : Should parse postgres log line with different log level : ERROR', () => {
    const rawLog = `2024-09-24 07:25:08.658 UTC [160] ERROR:  duplicate key value violates unique constraint "languages_pkey"`;
    const expected = {
      timestamp: '2024-09-24 07:25:08.658 UTC',
      logLevel: 'ERROR',
      message: 'duplicate key value violates unique constraint "languages_pkey"'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('POSTGRES : Should parse postgres log line with different log level : FATAL', () => {
    const rawLog = `2024-10-05 12:00:43.377 UTC [48661] FATAL:  unsupported frontend protocol 65363.19778: server supports 3.0 to 3.0`;
    const expected = {
      timestamp: '2024-10-05 12:00:43.377 UTC',
      logLevel: 'FATAL',
      message:
        'unsupported frontend protocol 65363.19778: server supports 3.0 to 3.0'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('POSTGRES : Should parse postgres log line with different log level : DETAIL', () => {
    const rawLog = `2024-09-24 07:25:08.658 UTC [160] DETAIL:  Key (id)=(43) already exists.`;
    const expected = {
      timestamp: '2024-09-24 07:25:08.658 UTC',
      logLevel: 'DETAIL',
      message: 'Key (id)=(43) already exists.'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('POSTGRES : Should parse postgres log line with different log level : DETAIL', () => {
    const rawLog = `2024-09-24 07:25:08.658 UTC [160] DETAIL:  Key (id)=(43) already exists.`;
    const expected = {
      timestamp: '2024-09-24 07:25:08.658 UTC',
      logLevel: 'DETAIL',
      message: 'Key (id)=(43) already exists.'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('POSTGRES : Should parse large postgres log line ', () => {
    const rawLog = `2024-09-24 07:25:08.658 UTC [160] STATEMENT:  INSERT INTO "public"."languages" ("compile_cmd","source_file","id","name","is_archived","run_cmd") VALUES (null,$1,$2,$3,$4,$5), (null,$6,$7,$8,$9,$10), ($11,$12,$13,$14,$15,$16), (null,$17,$18,$19,$20,$21), ($22,$23,$24,$25,$26,$27), ($28,$29,$30,$31,$32,$33), ($34,$35,$36,$37,$38,$39), ($40,$41,$42,$43,$44,$45), ($46,$47,$48,$49,$50,$51), ($52,$53,$54,$55,$56,$57), ($58,$59,$60,$61,$62,$63), ($64,$65,$66,$67,$68,$69), (null,$70,$71,$72,$73,$74), ($75,$76,$77,$78,$79,$80), (null,$81,$82,$83,$84,$85), (null,$86,$87,$88,$89,$90), ($91,$92,$93,$94,$95,$96), ($97,$98,$99,$100,$101,$102), ($103,$104,$105,$106,$107,$108), ($109,$110,$111,$112,$113,$114), (null,$115,$116,$117,$118,$119), ($120,$121,$122,$123,$124,$125), ($126,$127,$128,$129,$130,$131), (null,$132,$133,$134,$135,$136), ($137,$138,$139,$140,$141,$142), (null,$143,$144,$145,$146,$147), ($148,$149,$150,$151,$152,$153), (null,$154,$155,$156,$157,$158), (null,$159,$160,$161,$162,$163), (null,$164,$165,$166,$167,$168), ($169,$170,$171,$172,$173,$174), ($175,$176,$177,$178,$179,$180), ($181,$182,$183,$184,$185,$186), ($187,$188,$189,$190,$191,$192), ($193,$194,$195,$196,$197,$198), ($199,$200,$201,$202,$203,$204), ($205,$206,$207,$208,$209,$210), (null,$211,$212,$213,$214,$215), ($216,$217,$218,$219,$220,$221), (null,$222,$223,$224,$225,$226), ($227,$228,$229,$230,$231,$232), ($233,$234,$235,$236,$237,$238), (null,$239,$240,$241,$242,$243), (null,$244,$245,$246,$247,$248), (null,$249,$250,$251,$252,$253), ($254,$255,$256,$257,$258,$259), (null,null,$260,$261,$262,null)`;
    const expected = {
      timestamp: '2024-09-24 07:25:08.658 UTC',
      logLevel: 'STATEMENT',
      message:
        'INSERT INTO "public"."languages" ("compile_cmd","source_file","id","name","is_archived","run_cmd") VALUES (null,$1,$2,$3,$4,$5), (null,$6,$7,$8,$9,$10), ($11,$12,$13,$14,$15,$16), (null,$17,$18,$19,$20,$21), ($22,$23,$24,$25,$26,$27), ($28,$29,$30,$31,$32,$33), ($34,$35,$36,$37,$38,$39), ($40,$41,$42,$43,$44,$45), ($46,$47,$48,$49,$50,$51), ($52,$53,$54,$55,$56,$57), ($58,$59,$60,$61,$62,$63), ($64,$65,$66,$67,$68,$69), (null,$70,$71,$72,$73,$74), ($75,$76,$77,$78,$79,$80), (null,$81,$82,$83,$84,$85), (null,$86,$87,$88,$89,$90), ($91,$92,$93,$94,$95,$96), ($97,$98,$99,$100,$101,$102), ($103,$104,$105,$106,$107,$108), ($109,$110,$111,$112,$113,$114), (null,$115,$116,$117,$118,$119), ($120,$121,$122,$123,$124,$125), ($126,$127,$128,$129,$130,$131), (null,$132,$133,$134,$135,$136), ($137,$138,$139,$140,$141,$142), (null,$143,$144,$145,$146,$147), ($148,$149,$150,$151,$152,$153), (null,$154,$155,$156,$157,$158), (null,$159,$160,$161,$162,$163), (null,$164,$165,$166,$167,$168), ($169,$170,$171,$172,$173,$174), ($175,$176,$177,$178,$179,$180), ($181,$182,$183,$184,$185,$186), ($187,$188,$189,$190,$191,$192), ($193,$194,$195,$196,$197,$198), ($199,$200,$201,$202,$203,$204), ($205,$206,$207,$208,$209,$210), (null,$211,$212,$213,$214,$215), ($216,$217,$218,$219,$220,$221), (null,$222,$223,$224,$225,$226), ($227,$228,$229,$230,$231,$232), ($233,$234,$235,$236,$237,$238), (null,$239,$240,$241,$242,$243), (null,$244,$245,$246,$247,$248), (null,$249,$250,$251,$252,$253), ($254,$255,$256,$257,$258,$259), (null,null,$260,$261,$262,null)'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('POSTGRES : Should parse postgres with different log lines', () => {
    const rawLog = `2021-12-03 07:14:48.594 UTC [4913] DETAIL:  parameters: $1 = '1234', $2 = 'njchar
        hello', $3 = 'aaaa'`;

    const expected = {
      timestamp: '2021-12-03 07:14:48.594 UTC',
      logLevel: 'DETAIL',
      message: String.raw`parameters: $1 = '1234', $2 = 'njchar
        hello', $3 = 'aaaa'`
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('REDIS : Should parse redis log line', () => {
    const rawLog = `51:C 08 Oct 2024 04:21:40.147 # Redis version=7.0.15, bits=64, commit=00000000, modified=0, pid=51, just started`;
    const expected = {
      role: '51:C',
      timestamp: '08 Oct 2024 04:21:40.147',
      logLevel: 'WARNING',
      message:
        'Redis version=7.0.15, bits=64, commit=00000000, modified=0, pid=51, just started'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('REDIS : Should parse redis log line with different log level : # -> WARNING', () => {
    const rawLog = `51:M 08 Oct 2024 04:21:40.149 # WARNING Memory overcommit must be enabled! Without it, a background save or replication may fail under low memory condition. Being disabled, it can can also cause failures without low memory condition, see https://github.com/jemalloc/jemalloc/issues/1328. To fix this issue add 'vm.overcommit_memory = 1' to /etc/sysctl.conf and then reboot or run the command 'sysctl vm.overcommit_memory=1' for this to take effect.`;
    const expected = {
      role: '51:M',
      timestamp: '08 Oct 2024 04:21:40.149',
      logLevel: 'WARNING',
      message:
        "WARNING Memory overcommit must be enabled! Without it, a background save or replication may fail under low memory condition. Being disabled, it can can also cause failures without low memory condition, see https://github.com/jemalloc/jemalloc/issues/1328. To fix this issue add 'vm.overcommit_memory = 1' to /etc/sysctl.conf and then reboot or run the command 'sysctl vm.overcommit_memory=1' for this to take effect."
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('REDIS : Should parse redis log line with different log level : * -> NOTICE', () => {
    const rawLog = `51:M 08 Oct 2024 04:21:40.150 * Ready to accept connections`;
    const expected = {
      role: '51:M',
      timestamp: '08 Oct 2024 04:21:40.150',
      logLevel: 'NOTICE',
      message: 'Ready to accept connections'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('REDIS : Should parse redis log line with different log level : * -> NOTICE', () => {
    const rawLog = `51:M 08 Oct 2024 04:21:40.150 * Ready to accept connections`;
    const expected = {
      role: '51:M',
      timestamp: '08 Oct 2024 04:21:40.150',
      logLevel: 'NOTICE',
      message: 'Ready to accept connections'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });

  it('REDIS : Should parse redis log line with different log level : - -> INFO', () => {
    const rawLog = `53:C 08 Oct 2024 05:05:20.600 - INFO Connected to the Redis server at 127.0.0.1:6379`;
    const expected = {
      role: '53:C',
      timestamp: '08 Oct 2024 05:05:20.600',
      logLevel: 'INFO',
      message: 'INFO Connected to the Redis server at 127.0.0.1:6379'
    };
    expect(parseLogLine(rawLog)).toEqual(expected);
  });
});
