const PREC = {
  COMMENT: -2,
  ASSIGN: 15,
  BOOLEAN: 35,
  RELATIONAL: 40,
  CALL: 50,
  ARITHMETIC: 70,
};

const ID_REGEX = /[a-zA-Z][a-zA-Z0-9_\?!]*/;

module.exports = grammar({
  name: 'magik',

  extras: $ => [
    $.comment,
    /\s/,
  ],

  rules: {
    source_file: $ =>
      prec.left(
        repeat(
          choice(
            $.package,
            $.fragment,
            $._dollar,
          ),
        ),
      ),

    _line_terminator: $ => seq(optional('\r'), '\n'),

    fragment: $ =>
      prec.left(seq(repeat1(seq($._top_level_statement, $._line_terminator)), optional($._dollar))),

    package: $ =>
      prec.left(seq(alias(/_package/i, '_package'), $._identifier, repeat($.fragment))),

    _dollar: $ => token(seq('$', optional('\r'), '\n')),

    _method_declaration: $ =>
      seq(
        optional($.pragma),
        $.method,
      ),

    // [_private] _method <receiver>.<message_name> [( <arguments> )] | // [_private] _method <receiver>'[' <argument list> ']'
    //  <block body>
    // _endmethod
    method: $ =>
      prec.left(
        seq(
          optional(alias(/_abstract/i, '_abstract')),
          optional(alias(/_private/i, '_private')),
          optional(alias(/_iter/i, '_iter')),
          alias(/_method/i, '_method'),
          field('exemplarname', $.identifier),
          choice(
            seq(
              '.', field('name', $.identifier),
              optional(choice(
                seq(
                  '(',
                  optional(seq($.argument, repeat(seq(',', $.argument)))),
                  optional(seq(optional(','), alias(/_optional/i, '_optional'), $._arguments)),
                  optional(seq(optional(','), alias(/_gather/i, '_gather'), $.argument)),
                  ')', optional(seq(choice('<<', '^<<'), $._arguments))),
                seq('[', optional($._arguments), ']', optional(seq(choice('<<', '^<<'), $._arguments))),
                seq(choice('<<', '^<<'), $._arguments),
              ))),
            seq('[', optional($._arguments), ']', optional(seq(choice('<<', '^<<'), $._arguments)))),
          $._line_terminator,
          optional($.documentation),
          optional($._codeblock),
          alias(/_endmethod/i, '_endmethod'),
        ),
      ),

    // [_iter] _proc [@ <identifier>] ( [ <arguments> ] )
    // <block body>
    // _endproc
    procedure: $ =>
      seq(optional(alias(/_iter/i, '_iter')), alias(/_proc/i, '_proc'),
        optional($.label),
        seq(
          '(',
          optional(seq($.argument, repeat(seq(',', $.argument)))),
          optional(seq(optional(','), alias(/_optional/i, '_optional'), $._arguments)),
          optional(seq(optional(','), alias(/_gather/i, '_gather'), $.argument)),
          ')', optional(seq(choice('<<', '^<<'), $._arguments)),
        ),
        optional($._codeblock),
        alias(/_endproc/i, '_endproc'),
      ),

    argument: $ => $._identifier,

    _arguments: $ => prec.right(seq($.argument, repeat(seq(',', $.argument)), optional(','))),

    // _block [ @ <identifier> ]
    //   <statements>
    //   [ >> <rvalue tuple> ]
    // _endblock
    block: $ =>
      prec.left(
        seq(alias(/_block/i, '_block'), optional($.label), optional($._codeblock), alias(/_endblock/i, '_endblock')),
      ),

    assignment: $ =>
      prec.left(PREC.ASSIGN,
        seq($._expression,
          choice('<<', '^<<', '_and<<', '_andif<<', '_or<<', '_orif<<', '_xor<<', '**<<', '**^<<', '*<<', '*^<<', '/<<', '/^<<', '_mod<<', '_div<<', '-<<', '-^<<', '+<<', '+^<<'),
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
      seq(alias(/_if/i, '_if'),
        field('condition', $._expression),
        alias(/_then/i, '_then'),
        optional($._codeblock),
        repeat($.elif),
        optional($.else),
        alias(/_endif/i, '_endif'),
      ),

    elif: $ => seq(alias(/_elif/i, '_elif'), field('condition', $._expression), alias(/_then/i, '_then'), optional($._codeblock)),

    else: $ => seq(alias(/_else/i, '_else'), optional($._codeblock)),

    // _loop [ @ <identifier> ]
    //  <block body>
    // _endloop
    loop: $ =>
      seq(
        alias(/_loop/i, '_loop'),
        optional($.label),
        optional($._codeblock),
        alias(/_endloop/i, '_endloop'),
      ),

    // [ _finally [ _with <lvalue tuple> ]
    //  <block body> ]
    finally: $ => seq(alias(/_finally/i, '_finally'), optional(seq(alias(/_with/i, '_with'), $._identifier_list)), optional($._codeblock)),

    // _handling condition _with procedure
    handling: $ =>
      prec.left(seq(alias(/_handling/i, '_handling'), choice(
        alias(/_default/i, '_default'),
        seq(field('condition', $._expression), repeat(seq(',', field('condition', $._expression))), alias(/_with/i, '_with'), choice(alias(/_default/i, '_default'), $._expression))),
      )),

    // _catch <expression>
    //  <block body>
    // _endcatch
    catch: $ => seq(alias(/_catch/i, '_catch'), $._expression, $._terminator, optional($._codeblock), alias(/_endcatch/i, '_endcatch')),

    // _throw <expression> [ _with <rvalue tuple> ]
    throw: $ => prec.left(seq(alias(/_throw/i, '_throw'), $._expression, optional(seq(alias(/_with/i, '_with'), $._expression_list)))),

    // _primitive <number>
    primitive: $ => seq(alias(/_primitive/i, '_primitive'), $.number),

    // [ _for <lvalue tuple> ] _over <iter invocation>
    // _loop [ @<identifier> ]
    //  <block body>
    // [ _finally [ _with <lvalue tuple> ]
    //  <block body> ]
    // _endloop
    iterator: $ =>
      seq(
        optional(seq(alias(/_for/i, '_for'), $._identifier_list)),
        alias(/_over/i, '_over'), $._expression,
        seq(
          alias(/_loop/i, '_loop'),
          optional($.label),
          optional($._codeblock),
          optional($.finally),
          alias(/_endloop/i, '_endloop')),
      ),

    // _while <condition>
    // _loop [ @<identifier> ]
    //  <block body>
    // _endloop
    while: $ =>
      seq(alias(/_while/i, '_while'), field('condition', $._expression),
        seq(
          alias(/_loop/i, '_loop'),
          optional($.label),
          optional($._codeblock),
          alias(/_endloop/i, '_endloop')),
      ),

    // _try [ _with <name list> ]
    //   <block body 0>
    // _when <name list1>
    //   <block body 1>
    // _endtry
    try: $ =>
      seq(
        alias(/_try/i, '_try'),
        optional(seq(alias(/_with/i, '_with'), field('condition', $.identifier))),
        optional($._codeblock),
        repeat(seq(alias(/_when/i, '_when'),
          field('raised_condition', $.identifier), repeat(seq(',', field('raised_condition', $.identifier))),
          optional($._codeblock))),
        alias(/_endtry/i, '_endtry'),
      ),

    loopbody: $ =>
      seq(
        alias(/_loopbody/i, '_loopbody'),
        '(', seq($._expression, repeat(seq(',', $._expression))), ')',
      ),

    // _leave [ @ <identifier> ] [_with <rvalue tuple> ]
    leave: $ =>
      prec.left(seq(
        alias(/_leave/i, '_leave'),
        optional($.label),
        optional(seq(alias(/_with/i, '_with'), choice(
          seq('(', seq($._expression, repeat1(seq(',', $._expression))), ')'),
          seq($._expression, repeat(seq(',', $._expression)))))),
      )),

    // _continue _with <rvalue tuple>
    continue: $ =>
      prec.left(seq(
        alias(/_continue/i, '_continue'),
        optional($.label),
        optional(seq(alias(/_with/i, '_with'), choice(
          seq('(', seq($._expression, repeat1(seq(',', $._expression))), ')'),
          seq($._expression, repeat(seq(',', $._expression)))))),
      )),

    // _protect [ _locking <expression> ]
    //   <block body>
    // _protection
    //   <block body>
    // _endprotect
    protect: $ =>
      seq(
        alias(/_protect/i, '_protect'),
        optional(seq(alias(/_locking/i, '_locking'), $._expression, $._terminator)),
        optional($._codeblock),
        alias(/_protection/i, '_protection'),
        optional($._codeblock),
        alias(/_endprotect/i, '_endprotect'),
      ),

    // _lock <expression>
    //   <block body>
    // _endlock
    lock: $ =>
      seq(
        alias(/_lock/i, '_lock'),
        seq($._expression, $._terminator),
        optional($._codeblock),
        alias(/_endlock/i, '_endlock'),
      ),

    // _pragma (classify_level=<level>, topic={<set of topics>}, [ usage={<set of usages>} ] )
    pragma: $ => prec.left(seq(alias(/_pragma/i, '_pragma'), /(.*)/)),

    _literal: $ =>
      choice(
        $.true,
        $.false,
        $.maybe,
        $.character_literal,
        $.string_literal,
        $.regex_literal,
        $.number,
        $.unset,
        $.super,
        $.self,
        $.clone,
        $.symbol,
        $.thisthread,
        $.vector,
      ),

    character_literal: $ => seq('%', choice($._identifier, /./, ' ')),

    string_literal: $ =>
      choice(
        seq('"', repeat(choice(/[^"\n]/, /(.|\n)/)), '"'),
        seq('\'', repeat(choice(/[^'\n]/, /(.|\n)/)), '\''),
      ),

    // /<pattern>/<flags>
    regex_literal: $ => token(/\/.*?\/[qisdlmuCX]*/,),

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

    true: $ => alias(/_true/i, '_true'),
    false: $ => alias(/_false/i, '_false'),
    maybe: $ => alias(/_maybe/i, '_maybe'),
    unset: $ => alias(/_unset/i, '_unset'),
    super: $ => alias(/_super/i, '_super'),
    self: $ => alias(/_self/i, '_self'),
    clone: $ => alias(/_clone/i, '_clone'),

    thisthread: $ => alias(/_thisthread/i, '_thisthread'),

    class: $ => seq(alias(/_class/i, '_class'), field('java_classname', seq(/\|[a-zA-Z\d\.]*\|/))),

    _terminator: $ =>
      choice(';', $._line_terminator),

    _top_level_statement: $ => choice(
      $._definition,
      $._method_declaration,
      $._expression,
      $._global_assignment,
    ),

    _expression: $ => choice(
      $.handling,
      $.return,
      $.leave,
      $.continue,
      $.catch,
      $.throw,
      $.primitive,
      $.block,
      $.iterator,
      $.while,
      $.if,
      $.loop,
      $.try,
      $.loopbody,
      $.protect,
      $.lock,
      choice(
        $.parenthesized_expression,
        $.call,
        $.procedure,
        $.invoke,
        $.slot_accessor,
        $.indexed_access,
        $.gather,
        $.scatter,
        $.allresults,
        $.class,
        $.assignment,
        $.logical_operator,
        $.relational_operator,
        $.arithmetic_operator,
        $.unary_operator,
        $._literal,
        $._variable,
      ),
    ),

    _codeblock: $ => seq(
      choice($._expression, $._defvar),
      repeat(seq($._terminator, choice($._expression, $._defvar))),
      optional($._terminator)),

    _defvar: $ => choice(
      $.local,
      $.constant,
      $.dynamic_import,
      $.dynamic,
      $.global,
      $.import),

    global: $ => seq(alias(/_global/i, '_global'), choice($.identifier, $.global_variable, $.dynamic_variable), repeat(seq(',', choice($.identifier, $.global_variable, $.dynamic_variable)))),

    local: $ => prec.left(
      seq(alias(/_local/i, '_local'),
        choice(
          seq('(', seq($.identifier, optional(seq('<<', $._expression))), repeat(seq(',', seq($.identifier, optional(seq('<<', $._expression))))), ')'),
          seq('(', seq($.identifier, optional(seq('<<', $._expression))), repeat(seq(',', seq($.identifier, optional(seq('<<', $._expression))))), seq(',', alias(/_gather/i, '_gather'), seq($.identifier, optional(seq('<<', $._expression)))), ')'),
          seq('(', seq(alias(/_gather/i, '_gather'), $.identifier, optional(seq('<<', $._expression))), ')'),
          seq(seq($.identifier, optional(seq('<<', $._expression))), repeat(seq(',', seq($.identifier, optional(seq('<<', $._expression))))))),
        optional(seq('<<', $._expression)))),

    _global_assignment: $ =>
      seq(
        optional($.pragma),
        alias(/_global/i, '_global'), optional(alias(/_constant/i, '_constant')), choice($.identifier, $.dynamic_variable), '<<', $._expression),

    constant: $ =>
      seq(
        choice(
          alias(/_constant/i, '_constant'),
          seq(alias(/_constant/i, '_constant'), alias(/_local/i, '_local')),
          seq(alias(/_local/i, '_local'), alias(/_constant/i, '_constant'))),
        choice(
          seq('(', $._identifier_list, ')'),
          $._identifier_list),
        seq('<<', $._expression)),

    dynamic: $ => seq(alias(/_dynamic/i, '_dynamic'), $.dynamic_variable, repeat(seq(',', $.dynamic_variable)), optional(seq('<<', $._expression))),

    import: $ => seq(alias(/_import/i, '_import'), $._identifier_list),

    dynamic_import: $ => seq(alias(/_dynamic/i, '_dynamic'), alias(/_import/i, '_import'), $.dynamic_variable, repeat(seq(',', $.dynamic_variable))),

    return: $ =>
      prec.right(
        choice(
          seq(alias(/_return/i, '_return'), optional($._expression_list)),
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

    gather: $ => seq(alias(/_gather/i, '_gather'), $._expression),
    scatter: $ => seq(alias(/_scatter/i, '_scatter'), $._expression),
    allresults: $ => seq(alias(/_allresults/i, '_allresults'), $._expression),

    parenthesized_expression: $ => seq('(', $._expression_list, ')'),

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

    dynamic_variable: $ => token(seq(
      optional(seq(ID_REGEX, ':')),
      /![a-zA-Z0-9_\?!]*!/)),

    global_variable: $ => token(seq(ID_REGEX, ':', ID_REGEX)),

    global_reference: $ => token(seq('@', optional(seq(ID_REGEX, ':')), ID_REGEX)),

    identifier: $ => $._identifier,

    _identifier: $ => ID_REGEX,

    _identifier_list: $ =>
      prec.right(seq($.identifier, repeat(seq(',', $.identifier)))),

    number: $ => token(seq(
      choice(/\d+/, /\d+\.\d+/),
      optional(seq(/[eE&][\+-]?/, /\d+/)))),

    vector: $ => seq(
      '{',
      optional($._expression_list),
      '}',
    ),

    relational_operator: $ =>
      prec.right(PREC.RELATIONAL,
        seq(
          field('left', $._expression),
          field('operator', choice(alias(/_is/i, '_is'), alias(/_isnt/i, '_isnt'), alias(/_cf/i, '_cf'), '=', '~=', '<>', '>=', '<=', '<', '>')),
          field('right', $._expression),
        ),
      ),

    logical_operator: $ =>
      prec.left(PREC.BOOLEAN,
        seq(
          field('left', $._expression),
          field('operator', choice(alias(/_and/i, '_and'), alias(/_or/i, '_or'), alias(/_xor/i, '_xor'), alias(/_andif/i, '_andif'), alias(/_orif/i, '_orif'), alias(/_xorif/i, '_xorif'))),
          field('right', $._expression),
        ),
      ),

    arithmetic_operator: $ =>
      prec.left(PREC.ARITHMETIC,
        seq(
          field('left', $._expression),
          field('operator', choice('**', '*', '/', alias(/_mod/i, '_mod'), alias(/_div/i, '_div'), '-', '+')),
          field('right', $._expression),
        ),
      ),

    unary_operator: $ =>
      prec.right(seq(field('operator', choice('+', '-', alias(/_not/i, '_not'), '~')), $._expression)),

    symbol: $ => /:(\|[^|]*\||[a-zA-Z0-9_\?!]+)+/,

    documentation: $ => prec.right(repeat1(/##.*/)),
    comment: $ => token(prec(PREC.COMMENT, /#.*/)),
  },
});
