const PREC = {
  COMMENT: -2,
  ASSIGN: 15,
  BOOLEAN: 35,
  RELATIONAL: 40,
  CALL: 50,
  ARITHMETIC: 70,
};

module.exports = grammar({
  name: 'magik',

  extras: $ => [
    $.comment,
    /\s/,
  ],

  rules: {
    source_file: $ =>
      repeat(
        choice(
          $.package,
          $.fragment),
      ),

    _line_terminator: $ => seq(optional('\r'), '\n'),

    fragment: $ =>
      prec.left(seq(repeat1($._top_level_statement), optional(seq('$', $._line_terminator)))),

    package: $ =>
      prec.left(seq('_package', $._identifier, repeat($.fragment))),

    _method_declaration: $ =>
      seq(
        optional($.pragma),
        $.method,
      ),

    // [_private] _method <receiver>.<message_name> [( <arguments> )]
    //  <block body>
    // _endmethod
    method: $ =>
      prec.left(
        seq(
          optional('_abstract'),
          optional('_private'),
          optional('_iter'),
          '_method',
          field('exemplarname', $.identifier),
          '.',
          field('name', $.identifier),
          optional($.parameter_list),
          $._terminator,
          optional($.documentation),
          optional($._codeblock),
          '_endmethod',
        ),
      ),

    // _proc [@ <identifier>] ( [ <arguments> ] )
    // <block body>
    // _endproc
    procedure: $ =>
      seq('_proc',
        optional($.label),
        $.parameter_list,
        optional($._codeblock),
        '_endproc',
      ),

    parameter_list: $ =>
      choice(
        seq('(',
          optional(seq($.parameter, repeat(seq(',', $.parameter)))),
          optional(seq(optional(','), '_optional', $.parameter, repeat(seq(',', $.parameter)))),
          optional(seq(optional(','), '_gather', $.parameter)),
          ')',
        ),
        seq(
          choice('<<', '^<<'),
          seq($.parameter, repeat(seq(',', $.parameter)))),
      ),

    parameter: $ => $._identifier,

    // _block [ @ <identifier> ]
    //   <statements>
    //   [ >> <rvalue tuple> ]
    // _endblock
    block: $ =>
      prec.left(
        seq('_block', optional($.label), optional($._codeblock), '_endblock'),
      ),

    assignment: $ =>
      prec.left(PREC.ASSIGN,
        seq($._expression,
          choice('<<', '^<<', '_and<<', '_or<<', '_xor<<', '**<<', '**^<<', '*<<', '*^<<', '/<<', '/^<<', '_mod<<', '_div<<', '-<<', '-^<<', '+<<', '+^<<'),
          $._expression),
      ),

    // _if <condition1>
    // _then
    //  <block body>
    // [ _elif <condition2>
    //   _then
    //     <block body> ]
    //     ...
    // [ _else
    //   <block body> ]
    // _endif
    if: $ =>
      seq('_if',
        field('condition', $._expression),
        '_then',
        optional($._codeblock),
        repeat($.elif),
        optional($.else),
        '_endif',
      ),

    elif: $ => seq('_elif', field('condition', $._expression), '_then', optional($._codeblock)),

    else: $ => seq('_else', optional($._codeblock)),

    // _loop [ @ <identifier> ]
    //  <block body>
    // _endloop
    loop: $ =>
      seq(
        '_loop',
        optional($.label),
        optional($._codeblock),
        '_endloop',
      ),

    // [ _finally [ _with <lvalue tuple> ]
    //  <block body> ]
    finally: $ => seq('_finally', optional(seq('_with', $._identifier_list)), optional($._codeblock)),

    // _handling condition _with procedure
    handling: $ =>
      seq('_handling', choice(
        '_default',
        seq(field('condition', $._expression), repeat(seq(',', field('condition', $._expression))), '_with', choice('_default', $._expression))),
      ),

    // _catch <expression>
    //  <block body>
    // _endcatch
    catch: $ => seq('_catch', $._expression, $._terminator, optional($._codeblock), '_endcatch'),

    // _throw <expression> [ _with <rvalue tuple> ]
    throw: $ => seq('_throw', $._expression, optional(seq('_with', $._expression))),

    // _primitive <number>
    primitive: $ => seq('_primitive', $.number),

    // [ _for <lvalue tuple> ] _over <iter invocation>
    // _loop [ @<identifier> ]
    //  <block body>
    // [ _finally [ _with <lvalue tuple> ]
    //  <block body> ]
    // _endloop
    iterator: $ =>
      seq(
        optional(seq('_for', $._identifier_list)),
        '_over', $._expression,
        seq(
          '_loop',
          optional($.label),
          optional($._codeblock),
          optional($.finally),
          '_endloop'),
      ),

    // _while <condition>
    // _loop [ @<identifier> ]
    //  <block body>
    // _endloop
    while: $ =>
      seq('_while', field('condition', $._expression),
        seq(
          '_loop',
          optional($.label),
          optional($._codeblock),
          '_endloop'),
      ),

    // _try [ _with <name list> ]
    //   <block body 0>
    // _when <name list1>
    //   <block body 1>
    // _endtry
    try: $ =>
      seq(
        '_try',
        optional(seq('_with', field('condition', $.identifier))),
        optional($._codeblock),
        repeat(seq('_when',
          field('raised_condition', $.identifier), repeat(seq(',', field('raised_condition', $.identifier))),
          optional($._codeblock))),
        '_endtry',
      ),

    loopbody: $ =>
      seq(
        '_loopbody',
        '(', seq($._expression, repeat(seq(',', $._expression))), ')',
      ),

    // _leave [ @ <identifier> ] [_with <rvalue tuple> ]
    leave: $ =>
      seq(
        '_leave',
        optional($.label),
        optional(seq('_with', choice(
          seq('(', seq($._expression, repeat1(seq(',', $._expression))), ')'),
          seq($._expression, repeat(seq(',', $._expression)))))),
      ),

    // _continue _with <rvalue tuple>
    continue: $ =>
      seq(
        '_continue',
        optional($.label),
        optional(seq('_with', choice(
          seq('(', seq($._expression, repeat1(seq(',', $._expression))), ')'),
          seq($._expression, repeat(seq(',', $._expression)))))),
      ),

    // _protect [ _locking <expression> ]
    //   <block body>
    // _protection
    //   <block body>
    // _endprotect
    protect: $ =>
      seq(
        '_protect',
        optional(seq('_locking', $._expression, $._terminator)),
        optional($._codeblock),
        '_protection',
        optional($._codeblock),
        '_endprotect',
      ),

    // _lock <expression>
    //   <block body>
    // _endlock
    lock: $ =>
      seq(
        '_lock',
        seq($._expression, $._terminator),
        optional($._codeblock),
        '_endlock',
      ),

    // _pragma (classify_level=<level>, topic={<set of topics>}, [ usage={<set of usages>} ] )
    pragma: $ => prec.left(seq('_pragma', /(.*)/)),

    _literal: $ =>
      choice(
        $.true,
        $.false,
        $.maybe,
        $.character_literal,
        $.string_literal,
        $.number,
        $.unset,
        $.super,
        $.self,
        $.clone,
        $.symbol,
        $.vector,
      ),

    string_literal: $ =>
      choice(
        seq('"', repeat(choice(/[^"\n]/, /(.|\n)/)), '"'),
        seq('\'', repeat(choice(/[^'\n]/, /(.|\n)/)), '\''),
      ),

    call: $ =>
      prec.right(PREC.CALL,
        seq(
          field('receiver', $._expression),
          field('operator', '.'),
          field('message', $.identifier),
          optional(choice(
            seq('(', optional($._expression_list), ')'),
            seq('<<', optional($._expression_list)))),
        ),
      ),

    invoke: $ => prec.right(PREC.CALL,
      seq(
        field('receiver', $._expression),
        seq('(', optional($._expression_list), ')')),
    ),

    indexed_access: $ =>
      prec.left(PREC.CALL,
        seq(
          field('receiver', $._expression),
          field('index', seq('[', optional($._expression_list), ']')),
        ),
      ),

    slot_accessor: $ => prec.left(seq('.', /[a-zA-Z][a-zA-Z0-9_\?!]*/)),

    _expression_list: $ =>
      prec.right(seq($._expression, repeat(seq(',', $._expression)))),

    true: $ => '_true',
    false: $ => '_false',
    maybe: $ => '_maybe',
    unset: $ => '_unset',
    super: $ => '_super',
    self: $ => '_self',
    clone: $ => '_clone',

    thisthread: $ => '_thisthread',

    class: $ => seq('_class', field('java_classname', seq(/\|[a-zA-Z\d\.]*\|/))),

    _terminator: $ =>
      choice(';', $._line_terminator),

    _top_level_statement: $ => choice(
      $._definition,
      $._method_declaration,
      $._statement,
      $._global_assignment,
    ),

    _statement: $ => choice(
      $.handling,
      $.return,
      $.leave,
      $.continue,
      $.catch,
      $.throw,
      $.primitive,
      seq($._expression, $._terminator),
    ),

    _codeblock: $ => repeat1(choice($._statement, $._defvar)),

    _defvar: $ => choice(
      $.local,
      $.constant,
      $.dynamic_import,
      $.dynamic,
      $.global,
      $.import),

    global: $ => seq('_global', $._identifier_list),

    local: $ => prec.left(
      seq('_local',
        choice(
          seq('(', $._identifier_list, ')'),
          $._identifier_list),
        optional(seq('<<', $._expression)))),

    _global_assignment: $ =>
      seq(
        optional($.pragma),
        '_global', optional('_constant'), $.identifier, '<<', $._expression),

    constant: $ =>
      seq(
        choice(
          '_constant',
          seq('_constant', '_local'),
          seq('_local', '_constant')),
        choice(
          seq('(', $._identifier_list, ')'),
          $._identifier_list),
        seq('<<', $._expression)),

    dynamic: $ => seq('_dynamic', $.dynamic_variable, repeat(seq(',', $.dynamic_variable)), optional(seq('<<', $._expression))),

    import: $ => seq('_import', $._identifier_list),

    dynamic_import: $ => seq('_dynamic', '_import', $.dynamic_variable, repeat(seq(',', $.dynamic_variable))),

    return: $ =>
      prec.left(
        choice(
          seq('_return', optional($._expression_list)),
          seq('>>', $._expression_list),
        ),
      ),

    _definition: $ =>
      prec(1, seq($.pragma,
        optional($.documentation),
        choice(
          $.invoke,
          $.call)),
      ),

    gather: $ => seq('_gather', $._expression),
    scatter: $ => seq('_scatter', $._expression),
    allresults: $ => seq('_allresults', $._expression),

    parenthesized_expression: $ => seq('(', $._expression_list, ')'),

    _expression: $ =>
      choice(
        $.parenthesized_expression,
        $.procedure,
        $.block,
        $.call,
        $.invoke,
        $.slot_accessor,
        $.indexed_access,
        $.gather,
        $.scatter,
        $.allresults,
        $.iterator,
        $.while,
        $.if,
        $.loop,
        $.try,
        $.loopbody,
        $.protect,
        $.lock,
        $.thisthread,
        $.class,
        $.assignment,
        $.logical_operator,
        $.relational_operator,
        $.arithmetic_operator,
        $.unary_operator,
        $._literal,
        $._variable,
      ),

    _variable: $ =>
      choice(
        $.dynamic_variable,
        $.global_variable,
        $.global_reference,
        $.variable,
      ),

    // @ <identifier>
    label: $ =>
      /@\s?[a-zA-Z0-9_\?!]*/,

    variable: $ => prec.left($._identifier),

    dynamic_variable: $ => seq(
      optional(seq($._identifier, ':')),
      /![a-zA-Z0-9_\?!]*!/,
    ),

    global_variable: $ =>
      seq($._identifier, ':', $._identifier),

    global_reference: $ =>
      prec.left(seq('@', optional(seq($._identifier, ':')), $._identifier)),

    identifier: $ => $._identifier,

    _identifier: $ => prec(-2, /[a-zA-Z][a-zA-Z0-9_\?!]*/),

    _identifier_list: $ =>
      prec.right(seq($.identifier, repeat(seq(',', $.identifier)))),

    number: $ => seq(
      choice(/\d+/, /\d+\.\d+/),
      optional(choice(
        seq('e+', /\d+/),
        seq('e', /\d+/)))),

    vector: $ => seq(
      '{',
      optional($._expression_list),
      '}',
    ),

    relational_operator: $ =>
      prec.right(PREC.RELATIONAL,
        seq(
          field('left', $._expression),
          field('operator', choice('_is', '_isnt', '_cf', '=', '~=', '<>', '>=', '<=', '<', '>')),
          field('right', $._expression),
        ),
      ),

    logical_operator: $ =>
      prec.left(PREC.BOOLEAN,
        seq(
          field('left', $._expression),
          field('operator', choice('_and', '_or', '_xor', '_andif', '_orif', '_xorif')),
          field('right', $._expression),
        ),
      ),

    arithmetic_operator: $ =>
      prec.left(PREC.ARITHMETIC,
        seq(
          field('left', $._expression),
          field('operator', choice('**', '*', '/', '_mod', '_div', '-', '+')),
          field('right', $._expression),
        ),
      ),

    unary_operator: $ =>
      seq(field('operator', choice('+', '-', '_not', '~')), $._expression),

    symbol: $ => /:(\|[a-zA-Z0-9_\?!() ]+\||[a-zA-Z0-9_\?!]+)+/,

    character_literal: $ => seq('%', choice($._identifier, /./, ' ')),

    documentation: $ => prec.right(repeat1(/##.*/)),
    comment: $ => token(prec(PREC.COMMENT, /#.*/)),
  },
});
