(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Provides ease of access to all submodules
 *
 *  Copyright (C) 2010, 2011, 2013, 2014, 2015 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Wrap a prototype using ease.js
 *
 * This function is the entry point for ease.js; its fields expose all of
 * its core features.  When invoked, it wraps the given prototype using
 * ease.js, producing an ease.js Class.  This is more natural when using the
 * ECMAScript 6 `class` syntax to define prototypes.
 *
 * @param {Function} proto prototype to wrap
 *
 * @return {Function} ease.js Class wrapping PROTO
 */
var exports = module.exports = function( proto )
{
    return exports.Class.extend( proto, {} );
};

exports.Class         = require( './lib/class' );
exports.AbstractClass = require( './lib/class_abstract' );
exports.FinalClass    = require( './lib/class_final' );
exports.Interface     = require( './lib/interface' );
exports.Trait         = require( './lib/Trait' );
exports.version       = require( './lib/version' );

},{"./lib/Trait":8,"./lib/class":11,"./lib/class_abstract":12,"./lib/class_final":13,"./lib/interface":14,"./lib/version":20}],2:[function(require,module,exports){
/**
 * Handles building of classes
 *
 *  Copyright (C) 2011, 2012, 2013, 2014, 2015 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * TODO: This module is currently being tested /indirectly/ by the class
 *       tests. This is because of a refactoring. All of this logic used to
 *       be part of the class module. Test this module directly, but keep
 *       the existing class tests in tact for a higher-level test.
 */

var util    = require( './util' ),
    Warning = require( './warn' ).Warning,
    Symbol  = require( './util/Symbol' ),

    parseKeywords = require( './prop_parser' ).parseKeywords,

    hasOwn = Object.prototype.hasOwnProperty,


    /**
     * IE contains a nasty enumeration "bug" (poor implementation) that makes
     * toString unenumerable. This means that, if you do obj.toString = foo,
     * toString will NOT show up in `for` or hasOwnProperty(). This is a problem.
     *
     * This test will determine if this poor implementation exists.
     */
    enum_bug = (
        Object.prototype.propertyIsEnumerable.call(
            { toString: function() {} },
            'toString'
        ) === false
    )
    ? true
    : false,

    /**
     * Hash of reserved members
     *
     * These methods cannot be defined in the class; they are for internal
     * use only. We must check both properties and methods to ensure that
     * neither is defined.
     *
     * @type {Object.<string,boolean>}
     */
    reserved_members = {
        '__initProps': true,
    },

    /**
     * Hash of aliased members
     *
     * These are members that alias to another.  Ideally, this should be a
     * very small list.  It is useful for introducing features without
     * deprecating old.
     *
     * @type {Object.<string,string>}
     */
    aliased_members = {
        'constructor': '__construct',
    },

    /**
     * Hash of methods that must be public
     *
     * Notice that this is a list of /methods/, not members, because this check
     * is performed only for methods. This is for performance reasons. We do not
     * have a situation where we will want to check for properties as well.
     *
     * @type {Object.<string,boolean>}
     */
    public_methods = {
        '__construct': true,
        '__mixin':     true,
        'toString':    true,
        '__toString':  true,
    },

    /**
     * Symbol used to encapsulate internal data
     *
     * Note that this is intentionally generated *outside* the ClassBuilder
     * instance; this ensures that it is properly encapsulated and will not
     * be exposed on the Classbuilder instance (which would defeat the
     * purpose).
     */
    _priv = Symbol()
;


/**
 * Initializes class builder with given member builder
 *
 * The 'new' keyword is not required when instantiating this constructor.
 *
 * @param  {Object}  member_builder  member builder
 *
 * @param  {VisibilityObjectFactory}  visibility_factory  visibility object
 *                                                        generator
 *
 * @constructor
 */
module.exports = exports =
function ClassBuilder( warn_handler, member_builder, visibility_factory )
{
    // allow ommitting the 'new' keyword
    if ( !( this instanceof exports ) )
    {
        // module.exports for Closure Compiler
        return new module.exports(
            warn_handler, member_builder, visibility_factory
        );
    }

    /**
     * Determines how warnings should be handled
     * @type {WarningHandler}
     */
    this._warnHandler = warn_handler;

    /**
     * Used for building class members
     * @type {Object}
     */
    this._memberBuilder = member_builder;

    /**
     * Generates visibility object
     * @type {VisibilityObjectFactory}
     */
    this._visFactory = visibility_factory;


    /**
     * Class id counter, to be increment on each new definition
     * @type {number}
     */
    this._classId = 0;

    /**
     * Instance id counter, to be incremented on each new instance
     * @type {number}
     */
    this._instanceId = 0;

    /**
     * A flag to let the system know that we are currently attempting to access
     * a static property from within a method. This means that the caller should
     * be given access to additional levels of visibility.
     *
     * @type {boolean}
     */
    this._spropInternal = false;
};


/**
 * Default class implementation
 *
 * @return undefined
 */
exports.ClassBase = function Class() {};

// the base class has the class identifier 0
util.defineSecureProp( exports.ClassBase, '__cid', 0 );


/**
 * Default static property method
 *
 * This simply returns undefined, signifying that the property was not found.
 *
 * @param  {string}  prop  requested property
 *
 * @return  {undefined}
 */
exports.ClassBase.$ = function( prop, val )
{
    if ( val !== undefined )
    {
        throw ReferenceError(
            "Cannot set value of undeclared static property '" + prop + "'"
        );
    }

    return undefined;
};


/**
 * Returns a hash of the reserved members
 *
 * The returned object is a copy of the original. It cannot be used to modify
 * the internal list of reserved members.
 *
 * @return  {Object.<string,boolean>}  reserved members
 */
exports.getReservedMembers = function()
{
    // return a copy of the reserved members
    return util.clone( reserved_members, true );
};


/**
 * Returns a hash of the forced-public methods
 *
 * The returned object is a copy of the original. It cannot be used to modify
 * the internal list of reserved members.
 *
 * @return  {Object.<string,boolean>}  forced-public methods
 */
exports.getForcedPublicMethods = function()
{
    return util.clone( public_methods, true );
};


/**
 * Returns reference to metadata for the requested class
 *
 * Since a reference is returned (rather than a copy), the returned object can
 * be modified to alter the metadata.
 *
 * @param  {Function|Object}  cls  class from which to retrieve metadata
 *
 * @return  {__class_meta} or null if unavailable
 */
exports.getMeta = function( cls )
{
    return ( cls[ _priv ] || {} ).meta || null;
}


/**
 * Allow OBJ to assume an identity as a class
 *
 * This is useful to use objects in situations where classes are expected,
 * as it eliminates the need for handling of special cases.
 *
 * This is intended for internal use---there are no guarantees as to what
 * methods ease.js may expect that a class-like object incorporate.  That
 * guarantee may exist in the future, but until then, stay away.
 *
 * @param {Object} obj object to masquerade as an ease.js class
 *
 * @return {Object} OBJ
 */
exports.masquerade = function( obj )
{
    // XXX: this is duplicated; abstract
    util.defineSecureProp( obj, _priv, {} );

    createMeta( obj, exports.ClassBase );
    return obj;
};


/**
 * Determines if the class is an instance of the given type
 *
 * The given type can be a class, interface, trait or any other type of object.
 * It may be used in place of the 'instanceof' operator and contains additional
 * enhancements that the operator is unable to provide due to prototypal
 * restrictions.
 *
 * @param  {Object}  type      expected type
 * @param  {Object}  instance  instance to check
 *
 * @return  {boolean}  true if instance is an instance of type, otherwise false
 */
exports.isInstanceOf = function( type, instance )
{
    var meta, implemented, i;

    if ( !( type && instance ) )
    {
        return false;
    }

    // defer check to type, falling back to a more primitive check; this
    // also allows extending ease.js' type system
    return !!( type.__isInstanceOf || _instChk )( type, instance );
}


/**
 * Wrapper around ECMAScript instanceof check
 *
 * This will not throw an error if TYPE is not a function.
 *
 * Note that a try/catch is used instead of checking first to see if TYPE is
 * a function; this is due to the implementation of, notably, IE, which
 * allows instanceof to be used on some DOM objects with typeof `object'.
 * These same objects have typeof `function' in other browsers.
 *
 * @param  {*}       type      constructor to check against
 * @param  {Object}  instance  instance to examine
 *
 * @return  {boolean}  whether INSTANCE is an instance of TYPE
 */
function _instChk( type, instance )
{
    try
    {
        // check prototype chain (will throw an error if type is not a
        // constructor)
        if ( instance instanceof type )
        {
            return true;
        }
    }
    catch ( e ) {}

    return false;
}


/**
 * Mimics class inheritance
 *
 * This method will mimic inheritance by setting up the prototype with the
 * provided base class (or, by default, Class) and copying the additional
 * properties atop of it.
 *
 * The class to inherit from (the first argument) is optional. If omitted, the
 * first argument will be considered to be the properties list.
 *
 * @param  {Function|Object}  _   parent or definition object
 * @param  {Object=}          __  definition object if parent was provided
 *
 * @return  {Function}  extended class
 */
exports.prototype.build = function extend( _, __ )
{
    var build = this;

    var a         = arguments,
        an        = a.length,
        props     = ( ( an > 0 ) ? a[ an - 1 ] : 0 ) || {},
        base      = ( ( an > 1 ) ? a[ an - 2 ] : 0 ) || exports.ClassBase,
        prototype = this._getBase( base ),
        cname     = '',
        autoa     = false,

        prop_init      = this._memberBuilder.initMembers(),
        members        = this._memberBuilder.initMembers( prototype ),
        static_members = {
            methods: this._memberBuilder.initMembers(),
            props:   this._memberBuilder.initMembers(),
        },

        // constructor may be different than base
        pmeta = exports.getMeta( prototype.constructor ) || {},

        abstract_methods =
            util.clone( pmeta.abstractMethods )
            || { __length: 0 },

        virtual_members =
            util.clone( pmeta.virtualMembers )
            || {}
    ;

    // prevent extending final classes (TODO: abstract this check)
    if ( base.___$$final$$ === true )
    {
        throw Error(
            "Cannot extend final class " +
                ( base[ _priv ].meta.name || '(anonymous)' )
        );
    }

    // grab the name, if one was provided
    if ( cname = props.__name )
    {
        // we no longer need it
        delete props.__name;
    }

    // gobble up auto-abstract flag if present
    if ( ( autoa = props.___$$auto$abstract$$ ) !== undefined )
    {
        delete props.___$$auto$abstract$$;
    }

    // IE has problems with toString()
    if ( enum_bug )
    {
        if ( props.toString !== Object.prototype.toString )
        {
            props.__toString = props.toString;
        }
    }

    // increment class identifier
    this._classId++;

    // if we are inheriting from a prototype, we must make sure that all
    // properties initialized by the ctor are implicitly public; otherwise,
    // proxying will fail to take place
    // TODO: see Class.isA TODO
    if ( ( prototype[ _priv ] || {} ).vis === undefined )
    {
        this._discoverProtoProps( prototype, prop_init );
    }

    // build the various class components (XXX: this is temporary; needs
    // refactoring)
    try
    {
        this.buildMembers( props,
            this._classId,
            base,
            prop_init,
            {
                all:        members,
                'abstract': abstract_methods,
                'static':   static_members,
                'virtual':  virtual_members,
            },
            function( inst )
            {
                return new_class.___$$svis$$;
            }
        );
    }
    catch ( e )
    {
        // intercept warnings /only/
        if ( e instanceof Warning )
        {
            this._warnHandler.handle( e );
        }
        else
        {
            throw e;
        }
    }

    // reference to the parent prototype (for more experienced users)
    prototype.___$$parent$$ = base.prototype;

    // set up the new class
    var new_class = this.createCtor( cname, abstract_methods, members );

    // closure to hold static initialization to be used later by subtypes
    this.initStaticVisibilityObj( new_class );

    var _self = this;
    var staticInit = function( ctor, inheriting )
    {
        _self.attachStatic( ctor, static_members, base, inheriting );
    }
    staticInit( new_class, false );

    this._attachPropInit(
        prototype, prop_init, members, new_class, this._classId
    );

    new_class.prototype             = prototype;
    new_class.prototype.constructor = new_class;
    new_class.___$$props$$          = prop_init;
    new_class.___$$methods$$        = members;
    new_class.___$$sinit$$          = staticInit;

    attachFlags( new_class, props );
    validateAbstract( new_class, cname, abstract_methods, autoa );

    // We reduce the overall cost of this definition by defining it on the
    // prototype rather than during instantiation. While this does increase the
    // amount of time it takes to access the property through the prototype
    // chain, it takes much more time to define the property in this manner.
    // Therefore, we can save a substantial amount of time by defining it on the
    // prototype rather than on each new instance via __initProps().
    util.defineSecureProp( prototype, '__self', new_class.___$$svis$$ );

    // create internal metadata for the new class
    var meta = createMeta( new_class, base, pmeta );
    meta.abstractMethods = abstract_methods;
    meta.virtualMembers  = virtual_members;
    meta.name            = cname;

    attachAbstract( new_class, abstract_methods );
    attachId( new_class, this._classId );

    // returns a new instance of the class without invoking the constructor
    // (intended for use in prototype chains)
    new_class.asPrototype = function()
    {
        new_class[ _priv ].extending = true;
        var inst = new new_class();
        new_class[ _priv ].extending = false;

        return inst;
    };

    return new_class;
};


exports.prototype._getBase = function( base )
{
    var type = ( typeof base );

    switch ( type )
    {
        // constructor (we could also check to ensure that the return value of
        // the constructor is an object, but that is not our concern)
        case 'function':
            return ( base[ _priv ] )
                ? base.asPrototype()
                : new base();

        // we can use objects as the prototype directly
        case 'object':
            return base;
    }

    // scalars
    throw TypeError( 'Must extend from Class, constructor or object' );
};


/**
 * Discovers public properties on the given object and create an associated
 * property
 *
 * This allows inheriting from a prototype that uses properties by ensuring
 * that we properly proxy to that property. Otherwise, assigning the value
 * on the private visibilit object would mask the underlying value rather
 * than modifying it, leading to an inconsistent and incorrect state.
 *
 * This assumes that the object has already been initialized with all the
 * properties. This may not be the case if the prototype constructor does
 * not do so, in which case there is nothing we can do.
 *
 * This does not recurse on the prototype chian.
 *
 * For a more detailed description of this issue, see the interoperability
 * test case for classes.
 *
 * @param  {Object}  obj        object from which to gather properties
 * @param  {Object}  prop_init  destination property object
 *
 * @return  {undefined}
 */
exports.prototype._discoverProtoProps = function( obj, prop_init )
{
    var hasOwn = Object.hasOwnProperty,
        pub    = prop_init[ 'public' ];

    for ( var field in obj )
    {
        var value = obj[ field ];

        // we are not interested in the objtype chain, nor are we
        // interested in functions (which are methods and need not be
        // proxied)
        if ( !( hasOwn.call( obj, field ) )
            || typeof value === 'function'
        )
        {
            continue;
        }

        this._memberBuilder.buildProp(
            prop_init, null, field, value, {}
        );
    }
};


exports.prototype.buildMembers = function buildMembers(
    props, class_id, base, prop_init, memberdest, staticInstLookup
)
{
    var context = {
        _cb: this,

        // arguments
        prop_init:        prop_init,
        class_id:         class_id,
        base:             base,
        staticInstLookup: staticInstLookup,

        defs: {},

        // holds member builder state
        state: {},

        // TODO: there does not seem to be tests for these guys; perhaps
        // this can be rectified with the reflection implementation
        members:          memberdest.all,
        abstract_methods: memberdest['abstract'],
        static_members:   memberdest['static'],
        virtual_members:  memberdest['virtual'],
    };

    // default member handlers for parser
    var handlers = {
        each:     _parseEach,
        property: _parseProp,
        getset:   _parseGetSet,
        method:   _parseMethod,
    };

    // a custom parser may be provided to hook the below property parser;
    // this can be done to save time on post-processing, or alter the
    // default behavior of the parser
    if ( props.___$$parser$$ )
    {
        // this isn't something that we actually want to parse
        var parser = props.___$$parser$$;
        delete props.___$$parser$$;

        // TODO: this is recreated every call!
        var hjoin = function( name, orig )
        {
            handlers[ name ] = function()
            {
                var args = [],
                    i    = arguments.length;

                while ( i-- ) args[ i ] = arguments[ i ];

                // invoke the custom handler with the original handler as
                // its last argument (which the custom handler may choose
                // not to invoke at all)
                args.push( orig );
                parser[ name ].apply( context, args );
            };
        };

        // this avoids a performance penalty unless the above property is
        // set
        parser.each     && hjoin( 'each', handlers.each );
        parser.property && hjoin( 'property', handlers.property );
        parser.getset   && hjoin( 'getset', handlers.getset );
        parser.method   && hjoin( 'method', handlers.method );
    }

    handlers.keywordParser = _keywordParser;

    // parse members and process accumulated member state
    util.propParse( props, handlers, context );
    this._memberBuilder.end( context.state );
}


/**
 * Member keyword parser
 *
 * In reality, this parser is simply intended to override names where there
 * are applicable aliases; all keyword parsing is kept to the original
 * implementation.
 *
 * @param {string} prop property to parse
 *
 * @return  {{name: string, bitwords: number, keywords: Object.<string, boolean>}}
 */
function _keywordParser( prop )
{
    var result = parseKeywords( prop ),
        alias  = _getMemberAlias( result.name );

    if ( alias !== undefined )
    {
        result.name = alias;
    }

    return result;
}


/**
 * Return a member alias for NAME
 *
 * If NAME has no alias, then the result is `undefined`.
 *
 * @param {string} name member name
 *
 * @return {string|undefined}
 */
function _getMemberAlias( name )
{
    return ( hasOwn.call( aliased_members, name ) )
        ? aliased_members[ name ]
        : undefined;
}


function _parseEach( name, value, keywords )
{
    var defs = this.defs;

    // disallow use of our internal __initProps() method
    if ( reserved_members[ name ] === true )
    {
        throw Error( name + " is reserved" );
    }

    // if a member was defined multiple times in the same class
    // declaration, throw an error (unless the `weak' keyword is
    // provided, which exists to accomodate this situation)
    if ( hasOwn.call( defs, name )
        && !( keywords['weak'] || defs[ name ].weak )
    )
    {
        throw Error(
            "Cannot redefine method '" + name + "' in same declaration"
        );
    }

    // keep track of the definitions (only during class declaration)
    // to catch duplicates
    defs[ name ] = keywords;
}


function _parseProp( name, value, keywords )
{
    var dest = ( keywordStatic( keywords ) )
        ? this.static_members.props
        : this.prop_init;

    // build a new property, passing in the other members to compare
    // against for preventing nonsensical overrides
    this._cb._memberBuilder.buildProp(
        dest, null, name, value, keywords, this.base
    );
}


function _parseGetSet( name, get, set, keywords )
{
    var dest = ( keywordStatic( keywords ) )
            ? this.static_members.methods
            : this.members,

        is_static  = keywordStatic( keywords ),
        instLookup = ( ( is_static )
            ? this.staticInstLookup
            : exports.getMethodInstance
        );

    this._cb._memberBuilder.buildGetterSetter(
        dest, null, name, get, set, keywords, instLookup,
        this.class_id, this.base
    );
}


function _parseMethod( name, func, is_abstract, keywords )
{
    var is_static  = keywordStatic( keywords ),
        dest       = ( is_static )
            ? this.static_members.methods
            : this.members,
        instLookup = ( is_static )
            ? this.staticInstLookup
            : exports.getMethodInstance
    ;

    // constructor check
    if ( public_methods[ name ] === true )
    {
        if ( keywords[ 'protected' ] || keywords[ 'private' ] )
        {
            throw TypeError(
                name + " must be public"
            );
        }
    }

    var used = this._cb._memberBuilder.buildMethod(
        dest, null, name, func, keywords, instLookup,
        this.class_id, this.base, this.state
    );

    // do nothing more if we didn't end up using this definition
    // (this may be the case, for example, with weak members)
    if ( !used )
    {
        return;
    }

    // note the concrete method check; this ensures that weak
    // abstract methods will not count if a concrete method of the
    // smae name has already been seen
    if ( is_abstract )
    {
        this.abstract_methods[ name ] = true;
        this.abstract_methods.__length++;
    }
    else if ( ( hasOwn.call( this.abstract_methods, name ) )
        && ( is_abstract === false )
    )
    {
        // if this was a concrete method, then it should no longer
        // be marked as abstract
        delete this.abstract_methods[ name ];
        this.abstract_methods.__length--;
    }

    if ( keywords['virtual'] )
    {
        this.virtual_members[ name ] = true;
    }
    else
    {
        // final (non-virtual) definitions must clear the virtual flag from
        // their super method
        delete this.virtual_members[ name ];
    }
}


/**
 * Validates abstract class requirements
 *
 * We permit an `auto' flag for internal use only that will cause the
 * abstract flag to be automatically set if the class should be marked as
 * abstract, instead of throwing an error; this should be used sparingly and
 * never exposed via a public API (for explicit use), as it goes against the
 * self-documentation philosophy.
 *
 * @param  {function()}  ctor              class
 * @param  {string}      cname             class name
 * @param  {{__length}}  abstract_methods  object containing abstract methods
 * @param  {boolean}     auto              automatically flag as abstract
 *
 * @return  {undefined}
 */
function validateAbstract( ctor, cname, abstract_methods, auto )
{
    if ( ctor.___$$abstract$$ )
    {
        if ( !auto && ( abstract_methods.__length === 0 ) )
        {
            throw TypeError(
                "Class " + ( cname || "(anonymous)" ) + " was declared as " +
                "abstract, but contains no abstract members"
            );
        }
    }
    else if ( abstract_methods.__length > 0 )
    {
        if ( auto )
        {
            ctor.___$$abstract$$ = true;
            return;
        }

        throw TypeError(
            "Class " + ( cname || "(anonymous)" ) + " contains abstract " +
            "members and must therefore be declared abstract"
        );
    }
}


/**
 * Creates the constructor for a new class
 *
 * This constructor will call the __constructor method for concrete classes
 * and throw an exception for abstract classes (to prevent instantiation).
 *
 * @param  {string}          cname             class name (may be empty)
 * @param  {Array.<string>}  abstract_methods  list of abstract methods
 * @param  {Object}          members           class members
 *
 * @return  {Function}  constructor
 */
exports.prototype.createCtor = function( cname, abstract_methods, members )
{
    var new_class;

    if ( abstract_methods.__length === 0 )
    {
        new_class = this.createConcreteCtor( cname, members );
    }
    else
    {
        new_class = this.createAbstractCtor( cname );
    }

    util.defineSecureProp( new_class, _priv, {} );
    return new_class;
}


/**
 * Creates the constructor for a new concrete class
 *
 * This constructor will call the __constructor method of the class, if
 * available.
 *
 * @param  {string}  cname    class name (may be empty)
 * @param  {Object}  members  class members
 *
 * @return  {function()}  constructor
 */
exports.prototype.createConcreteCtor = function( cname, members )
{
    var args    = null,
        _self   = this;

    /**
     * Constructor function to be returned
     *
     * The name is set to ClassInstance because some debuggers (e.g. v8) will
     * show the name of this function for constructor instances rather than
     * invoking the toString() method
     *
     * @constructor
     *
     * Suppressing due to complaints for using __initProps
     * @suppress {checkTypes}
     */
    function ClassInstance()
    {
        if ( !( this instanceof ClassInstance ) )
        {
            // store arguments to be passed to constructor and
            // instantiate new object
            args = arguments;
            return new ClassInstance();
        }

        initInstance( this );
        this.__initProps();

        // If we're extending, we don't actually want to invoke any class
        // construction logic. The above is sufficient to use this class in a
        // prototype, so stop here.
        if ( ClassInstance[ _priv ].extending )
        {
            return;
        }

        // generate and store unique instance id
        attachInstanceId( this, ++_self._instanceId );

        // FIXME: this is a bit of a kluge for determining whether the ctor
        // should be invoked before a child prector...
        var haspre = ( typeof this.___$$ctor$pre$$ === 'function' );
        if ( haspre
            && ClassInstance.prototype.hasOwnProperty( '___$$ctor$pre$$' )
        )
        {
            // FIXME: we're exposing _priv to something that can be
            // malicously set by the user
            this.___$$ctor$pre$$( _priv );
            haspre = false;
        }

        // call the constructor, if one was provided
        if ( typeof this.__construct === 'function' )
        {
            // note that since 'this' refers to the new class (even
            // subtypes), and since we're using apply with 'this', the
            // constructor will be applied to subtypes without a problem
            this.__construct.apply( this, ( args || arguments ) );
        }

        // FIXME: see above
        if ( haspre )
        {
            this.___$$ctor$pre$$( _priv );
        }

        if ( typeof this.___$$ctor$post$$ === 'function' )
        {
            this.___$$ctor$post$$( _priv );
        }

        args = null;

        // attach any instance properties/methods (done after
        // constructor to ensure they are not overridden)
        attachInstanceOf( this );

        // Provide a more intuitive string representation of the class
        // instance. If a toString() method was already supplied for us,
        // use that one instead.
        if ( !( hasOwn.call( members[ 'public' ], 'toString' ) ) )
        {
            // use __toString if available (see enum_bug), otherwise use
            // our own defaults
            this.toString = members[ 'public' ].__toString
                || ( ( cname )
                    ? function()
                    {
                        return '#<' + cname + '>';
                    }
                    : function()
                    {
                        return '#<anonymous>';
                    }
                )
            ;
        }

    };

    // provide a more intuitive string representation
    ClassInstance.toString = ( cname )
        ? function() { return cname; }
        : function() { return '(Class)'; }
    ;

    return ClassInstance;
}


/**
 * Creates the constructor for a new abstract class
 *
 * Calling this constructor will cause an exception to be thrown, as abstract
 * classes cannot be instantiated.
 *
 * @param  {string}  cname  class name (may be empty)
 *
 * @return  {function()}  constructor
 */
exports.prototype.createAbstractCtor = function( cname )
{
    var _self = this;

    var __abstract_self = function()
    {
        if ( !__abstract_self[ _priv ].extending )
        {
            throw Error(
                "Abstract class " + ( cname || '(anonymous)' ) +
                    " cannot be instantiated"
            );
        }
    };

    __abstract_self.toString = ( cname )
        ? function()
        {
            return cname;
        }
        : function()
        {
            return '(AbstractClass)';
        }
    ;

    return __abstract_self;
}


/**
 * Attaches __initProps() method to the class prototype
 *
 * The __initProps() method will initialize class properties for that instance,
 * ensuring that their data is not shared with other instances (this is not a
 * problem with primitive data types).
 *
 * The method will also initialize any parent properties (recursive) to ensure
 * that subtypes do not have a referencing issue, and subtype properties take
 * precedence over those of the parent.
 *
 * @param  {Object}  prototype   prototype to attach method to
 * @param  {Object}  properties  properties to initialize
 *
 * @param  {{public: Object, protected: Object, private: Object}}  members
 *
 * @param  {function()}  ctor  class
 * @param  {number}     cid  class id
 *
 * @return  {undefined}
 */
exports.prototype._attachPropInit = function(
    prototype, properties, members, ctor, cid
)
{
    var _self = this;

    util.defineSecureProp( prototype, '__initProps', function( inherit )
    {
        // defaults to false
        inherit = !!inherit;

        var iid    = this.__iid,
            parent = prototype.___$$parent$$,
            vis    = this[ _priv ].vis;

        // first initialize the parent's properties, so that ours will overwrite
        // them
        var parent_init = parent && parent.__initProps;
        if ( typeof parent_init === 'function' )
        {
            // call the parent prop_init, letting it know that it's been
            // inherited so that it does not initialize private members or
            // perform other unnecessary tasks
            parent_init.call( this, true );
        }

        // this will return our property proxy, if supported by our environment,
        // otherwise just a normal object with everything merged in
        var inst_props = _self._visFactory.createPropProxy(
            this, vis, properties[ 'public' ]
        );

        // Copies all public and protected members into inst_props and stores
        // private in a separate object, which adds inst_props to its prototype
        // chain and is returned. This is stored in a property referenced by the
        // class id, so that the private members can be swapped on each method
        // request, depending on calling context.
        var vis = vis[ cid ] = _self._visFactory.setup(
            inst_props, properties, members
        );

        // provide a means to access the actual instance (rather than the
        // property/visibility object) internally (this will translate to
        // this.__inst from within a method), but only if we're on our final
        // object (not a parent)
        if ( !inherit )
        {
            util.defineSecureProp( vis, '__inst', this );
        }
    });
}


/**
 * Determines if the given keywords should result in a static member
 *
 * A member will be considered static if the static or const keywords are given.
 *
 * @param {Object} keywords keywords to scan
 *
 * @return {boolean} true if to be static, otherwise false
 */
function keywordStatic( keywords )
{
    return ( keywords[ 'static' ] || keywords[ 'const' ] )
        ? true
        : false
    ;
}


/**
 * Creates and populates the static visibility object
 *
 * @param  {Function}  ctor  class
 *
 * @return  {undefined}
 */
exports.prototype.initStaticVisibilityObj = function( ctor )
{
    var _self = this;

    /**
     * the object will simply be another layer in the prototype chain to
     * prevent protected/private members from being mixed in with the public
     *
     * @constructor
     */
    var sobj = function() {};
    sobj.prototype = ctor;

    var sobji = new sobj();

    // override __self on the instance's visibility object, giving internal
    // methods access to the restricted static methods
    ctor.___$$svis$$ = sobji;

    // Override the class-level accessor method to allow the system to know we
    // are within a method. An internal flag is necessary, rather than using an
    // argument or binding, because those two options are exploitable. An
    // internal flag cannot be modified by conventional means.
    sobji.$ = function()
    {
        _self._spropInternal = true;
        var val = ctor.$.apply( ctor, arguments );
        _self._spropInternal = false;

        return val;
    };
}


/**
 * Attaches static members to a constructor (class)
 *
 * Static methods will be assigned to the constructor itself. Properties, on the
 * other hand, will be assigned to ctor.$. The reason for this is because JS
 * engines pre-ES5 support no means of sharing references to primitives. Static
 * properties of subtypes should share references to the static properties of
 * their parents.
 *
 * @param  {function()}  ctor        class
 * @param  {Object}      members     static members
 * @param  {function()}  base        base class inheriting from
 * @param  {boolean}     inheriting  true if inheriting static members,
 *                                   otherwise false (setting own static
 *                                   members)
 *
 * @return  {undefined}
 */
exports.prototype.attachStatic = function( ctor, members, base, inheriting )
{
    var methods = members.methods,
        props   = members.props,
        _self   = this
    ;

    // "Inherit" the parent's static methods by running the parent's static
    // initialization method. It is important that we do this before anything,
    // because this will recursively inherit all members in order, permitting
    // overrides.
    var baseinit = base.___$$sinit$$;
    if ( baseinit )
    {
        baseinit( ctor, true );
    }

    // initialize static property if not yet defined
    if ( !inheriting )
    {
        ctor.___$$sprops$$ = props;

        // provide a method to access static properties
        util.defineSecureProp( ctor, '$', function( prop, val )
        {
            // we use hasOwnProperty to ensure that undefined values will not
            // cause us to continue checking the parent, thereby potentially
            // failing to set perfectly legal values
            var found = false,

                // Determine if we were invoked in the context of a class. If
                // so, use that.  Otherwise, use ourself.
                context = ( this.___$$sprops$$ ) ? this : ctor,

                // We are in a subtype if the context does not match the
                // constructor. This works because, when invoked for the first
                // time, this method is not bound to the constructor. In such a
                // case, we default the context to the constructor and pass that
                // down the line to each recursive call. Therefore, recursive
                // calls to subtypes will have a context mismatch.
                in_subtype = ( context !== ctor )
            ;

            // Attempt to locate the property. First, we check public. If not
            // available and we are internal (within a method), we can move on
            // to check other levels of visibility. `found` will contain the
            // visibility level the property was found in, or false.
            found = hasOwn.call( props[ 'public' ], prop ) && 'public';
            if ( !found && _self._spropInternal )
            {
                // Check for protected/private. We only check for private
                // properties if we are not currently checking the properties of
                // a subtype. This works because the context is passed to each
                // recursive call.
                found = hasOwn.call( props[ 'protected' ], prop ) && 'protected'
                    || !in_subtype
                        && hasOwn.call( props[ 'private' ], prop ) && 'private'
                ;
            }

            // if we don't own the property, let the parent(s) handle it
            if ( found === false )
            {
                // TODO: This check is simple, but quick. It may be worth
                // setting a flag on the class during definition to specify if
                // it's extending from a non-class base.
                return ( base.__cid && base.$ || exports.ClassBase.$ ).apply(
                    context, arguments
                );
            }

            var prop_item = props[ found ][ prop ];

            // if a value was provided, this method should be treated as a
            // setter rather than a getter (we *must* test using
            // arguments.length to ensure that setting to undefined works)
            if ( arguments.length > 1 )
            {
                // if const, disallow modification
                if ( prop_item[ 1 ][ 'const' ] )
                {
                    throw TypeError(
                        "Cannot modify constant property '" + prop + "'"
                    );
                }

                prop_item[ 0 ] = val;
                return context;
            }
            else
            {
                // return the value
                return prop_item[ 0 ];
            }
        } );
    }

    // copy over public static methods
    util.copyTo( ctor, methods[ 'public' ], true );
    util.copyTo( ctor.___$$svis$$, methods[ 'protected' ], true );

    // private methods should not be inherited by subtypes
    if ( !inheriting )
    {
        util.copyTo( ctor.___$$svis$$, methods[ 'private' ], true );
    }
}


/**
 * Initializes class metadata for the given class
 *
 * DYNMETA is used only when CPARENT's metadata are flagged as "lazy",
 * meaning that the data are not available at the time of its definition,
 * but are available now as DYNMETA.
 *
 * @param  {Function}  func     class to initialize metadata for
 * @param  {Function}  cparent  class parent
 * @param  {?Object}   dynmeta  dynamic metadata
 *
 * @return  {undefined}
 *
 * Suppressed due to warnings for use of __cid
 * @suppress {checkTypes}
 */
function createMeta( func, cparent, dynmeta )
{
    var id          = func.__cid,
        parent_meta = ( cparent[ _priv ]
            ? exports.getMeta( cparent )
            : undefined
        );

    // copy the parent prototype's metadata if it exists (inherit metadata)
    if ( parent_meta )
    {
        return func[ _priv ].meta = util.clone(
            // "lazy" metadata are unavailable at the time of definition
            parent_meta._lazy
                ? dynmeta
                : parent_meta,
            true
        );
    }

    // create empty
    return func[ _priv ].meta = {
        implemented: [],
    };
}


/**
 * Attaches an instance identifier to a class instance
 *
 * @param  {Object}  instance  class instance
 * @param  {number}  iid       instance id
 *
 * @return  {undefined}
 */
function attachInstanceId( instance, iid )
{
    util.defineSecureProp( instance, '__iid', iid );
}


/**
 * Initializes class instance
 *
 * This process will create the instance visibility object that will contain
 * private and protected members. The class instance is part of the prototype
 * chain.  This will be passed to all methods when invoked, permitting them to
 * access the private and protected members while keeping them encapsulated.
 *
 * For each instance, there is always a base. The base will contain a proxy to
 * the public members on the instance itself. The base will also contain all
 * protected members.
 *
 * Atop the base object is a private member object, with the base as its
 * prototype. There exists a private member object for the instance itself and
 * one for each supertype. This is stored by the class id (cid) as the key. This
 * permits the private member object associated with the class of the method
 * call to be bound to that method. For example, if a parent method is called,
 * that call must be invoked in the context of the parent, so the private
 * members of the parent must be made available.
 *
 * The resulting structure looks something like this:
 *   class_instance = { iid: { cid: {} } }
 *
 * @param  {Object}  instance  instance to initialize
 *
 * @return  {undefined}
 */
function initInstance( instance )
{
    /** @constructor */
    var prot = function() {};
    prot.prototype = instance;

    // initialize our *own* private metadata store; do not use the
    // prototype's
    util.defineSecureProp( instance, _priv, {} );

    // add the visibility objects to the data object for this class instance
    instance[ _priv ].vis = new prot();
}


/**
 * Attaches partially applied isInstanceOf() method to class instance
 *
 * @param  {Object}  instance  class instance to attach method to
 *
 * @return  {undefined}
 */
function attachInstanceOf( instance )
{
    var method = function( type )
    {
        return module.exports.isInstanceOf( type, instance );
    };

    // TODO: To improve performance (defineSecureProp can be costly), simply
    // define a normal prop and freeze the class afterward. The class shouldn't
    // have any mutable methods.
    util.defineSecureProp( instance, 'isInstanceOf', method );
    util.defineSecureProp( instance, 'isA', method );
}


/**
 * Returns the instance object associated with the given method
 *
 * The instance object contains the protected members. This object can be passed
 * as the context when calling a method in order to give that method access to
 * those members.
 *
 * One level above the instance object on the prototype chain is the object
 * containing the private members. This is swappable, depending on the class id
 * associated with the provided method call. This allows methods that were not
 * overridden by the subtype to continue to use the private members of the
 * supertype.
 *
 * @param  {function()}  inst  instance that the method is being called from
 * @param  {number}      cid   class id
 *
 * @return  {Object|null}  instance object if found, otherwise null
 *
 * @suppress {checkTypes}
 */
exports.getMethodInstance = function( inst, cid )
{
    if ( inst === undefined )
    {
        return null;
    }

    var iid  = inst.__iid,
        priv = inst[ _priv ],
        data;

    return ( iid && priv && ( data = priv.vis ) )
        ? data[ cid ]
        : null
    ;
}


/**
 * Attaches isAbstract() method to the class
 *
 * The method returns whether the class contains abstract methods (and is
 * therefore abstract).
 *
 * @param  {Function}  func     function (class) to attach method to
 * @param  {Array}     methods  abstract method names
 *
 * @return  {undefined}
 */
function attachAbstract( func, methods )
{
    var is_abstract = ( methods.__length > 0 ) ? true: false;

    util.defineSecureProp( func, 'isAbstract', function()
    {
        return is_abstract;
    });
}


/**
 * Attaches the unique id to the class and its prototype
 *
 * The unique identifier is used internally to match a class and its instances
 * with the class metadata. Exposing the id breaks encapsulation to a degree,
 * but is a lesser evil when compared to exposing all metadata.
 *
 * @param  {function()}  ctor  constructor (class) to attach method to
 * @param  {number}      id    id to assign
 *
 * @return  {undefined}
 */
function attachId( ctor, id )
{
    util.defineSecureProp( ctor, '__cid', id );
    util.defineSecureProp( ctor.prototype, '__cid', id );
}


/**
 * Sets class flags
 *
 * @param  {Function}  ctor   class to flag
 * @param  {Object}   props  class properties
 *
 * @return  {undefined}
 */
function attachFlags( ctor, props )
{
    ctor.___$$final$$    = !!( props.___$$final$$ );
    ctor.___$$abstract$$ = !!( props.___$$abstract$$ );

    // The properties are no longer needed. Set to undefined rather than delete
    // (v8 performance)
    props.___$$final$$ = props.___$$abstract$$ = undefined;
}

},{"./prop_parser":15,"./util":16,"./util/Symbol":18,"./warn":21}],3:[function(require,module,exports){
/**
 * Contains fallback visibility object factory
 *
 *  Copyright (C) 2010, 2011, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Initializes fallback visibility object factory
 *
 * Unlike the standard visibility object, fallback does not create various
 * layers. This is for the simple fact that setting a value on one of the layers
 * is not visible to layers beneath it (its prototypes). Fallback is necessary
 * if proxy support or emulation (via ES5 getters/setters) is unavailable.
 */
module.exports = exports = function FallbackVisibilityObjectFactory()
{
    // permit omitting 'new' keyword
    if ( !( this instanceof exports ) )
    {
        // module.exports for Closure Compiler
        return new module.exports();
    }
};


/**
 * "Inherit" from VisibilityObjectFactory
 */
exports.prototype = require( './VisibilityObjectFactory' )();


/**
 * Do not create private visibility layer
 *
 * We're likely falling back because we cannot properly support the private
 * visibility layer. Therefore, it will be omitted.
 *
 * @param  {Object}  atop_of     will be returned, unmodified
 * @param  {Object}  properties  ignored
 *
 * @return  {Object}  provided object with no additional layer
 */
exports.prototype._createPrivateLayer = function( atop_of, properties )
{
    return atop_of;
};


/**
 * Does not create property proxy
 *
 * The fallback implementation is used because proxies are not supported and
 * cannot be emulated with getters/setters.
 *
 * @param  {Object}  base   will be returned, unmodified
 * @param  {Object}  dest   ignored
 * @param  {Object}  props  ignored
 *
 * @return  {Object}  given base
 */
exports.prototype.createPropProxy = function( base, dest, props )
{
    return base;
};


},{"./VisibilityObjectFactory":9}],4:[function(require,module,exports){
/**
 * Handles building members (properties, methods)
 *
 *  Copyright (C) 2010, 2011, 2012, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * This prototype could have easily been refactored into a number of others
 * (e.g. one for each type of member), but that refactoring has been
 * deferred until necessary to ensure ease.js maintains a relatively small
 * footprint.  Ultimately, however, such a decision is a micro-optimization
 * and shouldn't harm the design and maintainability of the software.
 *
 * TODO: Implementation is inconsistent between various members. For
 * example, methods use ___$$keywords$$, whereas properties use [ val,
 * keywords ]. Decide on a common format.
 */

var util       = require( './util' ),
    visibility = [ 'public', 'protected', 'private' ]
;


/**
 * Responsible for building class members
 *
 * @param  {Function}                wrap_method    method wrapper
 * @param  {Function}                wrap_override  method override wrapper
 * @param  {Function}                wrap_proxy     method proxy wrapper
 * @param  {MemberBuilderValidator}  validate       member validator
 *
 * @constructor
 */
module.exports = function MemberBuilder(
    wrap_method, wrap_override, wrap_proxy, validate
)
{
    // permit omitting 'new' keyword
    if ( !( this instanceof module.exports ) )
    {
        return new module.exports(
            wrap_method, wrap_override, wrap_proxy, validate
        );
    }

    this._wrapMethod   = wrap_method;
    this._wrapOverride = wrap_override;
    this._wrapProxy    = wrap_proxy;

    this._validate = validate;
};


// we're throwing everything into the prototype
exports = module.exports.prototype;


/**
 * Initializes member object
 *
 * The member object contains members for each level of visibility (public,
 * protected and private).
 *
 * @param  {Object}  mpublic     default public members
 * @param  {Object}  mprotected  default protected members
 * @param  {Object}  mprivate    default private members
 *
 * @return  {__visobj}
 */
exports.initMembers = function( mpublic, mprotected, mprivate )
{
    return {
        'public':    mpublic    || {},
        'protected': mprotected || {},
        'private':   mprivate   || {},
    };
};


/**
 * Copies a method to the appropriate member prototype, depending on
 * visibility, and assigns necessary metadata from keywords
 *
 * The provided ``member run'' state object is required and will be
 * initialized automatically if it has not been already. For the first
 * member of a run, the object should be empty.
 *
 * @param  {__visobj}  members
 * @param  {!Object}   meta     metadata container
 * @param  {string}    name     property name
 * @param  {*}         value    property value
 *
 * @param  {!Object.<boolean>}  keywords  parsed keywords
 *
 * @param  {Function}  instCallback  function to call in order to retrieve
 *                                   object to bind 'this' keyword to
 *
 * @param  {number}   cid   class id
 * @param  {Object=}  base  optional base object to scan
 *
 * @param  {Object}  state  member run state object
 *
 * @return  {undefined}
 */
exports.buildMethod = function(
    members, meta, name, value, keywords, instCallback, cid, base, state
)
{
    // these defaults will be used whenever a keyword set is unavailable,
    // which should only ever be the case if we're inheriting from a
    // prototype rather than an ease.js class/etc
    var kdefaults = this._methodKeywordDefaults;

    // TODO: We can improve performance by not scanning each one individually
    // every time this method is called
    var prev_data     = scanMembers( members, name, base ),
        prev          = ( prev_data ) ? prev_data.member : null,
        prev_keywords = ( prev && ( prev.___$$keywords$$ || kdefaults ) ),
        dest          = getMemberVisibility( members, keywords, name );
    ;

    // ensure that the declaration is valid (keywords make sense, argument
    // length, etc)
    this._validate.validateMethod(
        name, value, keywords, prev_data, prev_keywords, state
    );

    // we might be overriding an existing method
    if ( keywords[ 'proxy' ] && !( prev && keywords.weak ) )
    {
        // TODO: Note that this is not compatible with method hiding, due to its
        // positioning (see hideMethod() below); address once method hiding is
        // implemented (the validators currently handle everything else)
        dest[ name ] = this._createProxy(
            value, instCallback, cid, name, keywords
        );
    }
    else if ( prev )
    {
        if ( keywords.weak && !( prev_keywords[ 'abstract' ] ) )
        {
            // another member of the same name has been found; discard the
            // weak declaration
            return false;
        }
        else if ( keywords[ 'override' ] || prev_keywords[ 'abstract' ] )
        {
            // if we have the `abstract' keyword at this point, then we are
            // an abstract override
            var override = ( keywords[ 'abstract' ] )
                ? aoverride( name )
                : prev;

            // override the method
            dest[ name ] = this._overrideMethod(
                override, value, instCallback, cid
            );
        }
        else
        {
            // by default, perform method hiding, even if the keyword was not
            // provided (the keyword simply suppresses the warning)
            dest[ name ] = hideMethod( prev, value, instCallback, cid );
        }

    }
    else if ( keywords[ 'abstract' ] || keywords[ 'private' ] )
    {
        // we do not want to wrap abstract methods, since they are not
        // callable; further, we do not need to wrap private methods, since
        // they are only ever accessible when we are already within a
        // private context (see test case for more information)
        dest[ name ] = value;
    }
    else
    {
        // we are not overriding the method, so simply copy it over, wrapping it
        // to ensure privileged calls will work properly
        dest[ name ] = this._overrideMethod( null, value, instCallback, cid );
    }

    // store keywords for later reference (needed for pre-ES5 fallback)
    dest[ name ].___$$keywords$$ = keywords;
    return true;
};


/**
 * Default keywords to apply to methods inherited from a prototype.
 * @type  {Object}
 */
exports._methodKeywordDefaults = { 'virtual': true };


/**
 * Creates an abstract override super method proxy to NAME
 *
 * This is a fairly abstract concept that is disastrously confusing without
 * having been put into the proper context: This function is intended to be
 * used as a super method for a method override in the case of abstract
 * overrides. It only makes sense to be used, at least at this time, with
 * mixins.
 *
 * When called, the bound context (`this') will be the private member object
 * of the caller, which should contain a reference to the protected member
 * object of the supertype to proxy to. It is further assumed that the
 * protected member object (pmo) defines NAME such that it proxies to a
 * mixin; this means that invoking it could result in an infinite loop. We
 * therefore skip directly to the super-super method, which will be the
 * method we are interested in proxying to.
 *
 * There is one additional consideration: If this super method is proxying
 * from a mixin instance into a class, then it is important that we bind the
 * calling context to the pmo instaed of our own context; otherwise, we'll
 * be executing within the context of the trait, without access to the
 * members of the supertype that we are proxying to! The pmo will be used by
 * the ease.js method wrapper to look up the proper private member object,
 * so it is not a problem that the pmo is being passed in.
 *
 * That's a lot of text for such a small amount of code.
 *
 * @param  {string}  name  name of method to proxy to
 *
 * @return  {Function}  abstract override super method proxy
 */
function aoverride( name )
{
    return function()
    {
        return this.___$$super$$.prototype[ name ]
            .apply( this.___$$pmo$$, arguments );
    };
}


/**
 * Copies a property to the appropriate member prototype, depending on
 * visibility, and assigns necessary metadata from keywords
 *
 * @param  {__visobj}  members
 * @param  {!Object}   meta     metadata container
 * @param  {string}    name     property name
 * @param  {*}         value    property value
 *
 * @param  {!Object.<boolean>}  keywords  parsed keywords
 *
 * @param  {Object=}  base  optional base object to scan
 *
 * @return  {undefined}
 */
exports.buildProp = function( members, meta, name, value, keywords, base )
{
    // TODO: We can improve performance by not scanning each one individually
    // every time this method is called
    var prev_data     = scanMembers( members, name, base ),
        prev          = ( prev_data ) ? prev_data.member : null,
        prev_keywords = ( prev ) ? prev[ 1 ] : null;

    this._validate.validateProperty(
        name, value, keywords, prev_data, prev_keywords
    );

    getMemberVisibility( members, keywords, name )[ name ] =
        [ value, keywords ];
};


/**
 * Copies a getter/setter to the appropriate member prototype, depending on
 * visibility, and assigns necessary metadata from keywords
 *
 * TODO: This should essentially mirror buildMethod with regards to overrides,
 * proxies, etc.
 *
 * @param  {!__visobj}  members
 * @param  {!Object}    meta     metadata container
 * @param  {string}     name     getter name
 * @param  {*}          get      getter value
 * @param  {*}          set      setter value
 *
 * @param  {!Object.<boolean>}  keywords  parsed keywords
 *
 * @param  {Function}  instCallback  function to call in order to retrieve
 *                                   object to bind 'this' keyword to
 *
 * @param  {number}   cid   class id
 * @param  {Object=}  base  optional base object to scan
 *
 * @return  {undefined}
 *
 * Closure Compiler is improperly throwing warnings on Object.defineProperty():
 * @suppress {checkTypes}
 */
exports.buildGetterSetter = function(
    members, meta, name, get, set, keywords, instCallback, cid, base
)
{
    var prev_data     = scanMembers( members, name, base ),
        prev_keywords = ( ( prev_data && prev_data.get )
            ? prev_data.get.___$$keywords$$
            : null
        )
    ;

    this._validate.validateGetterSetter(
        name, {}, keywords, prev_data, prev_keywords
    );

    if ( get )
    {
        get = this._overrideMethod( null, get, instCallback, cid );

        // ensure we store the keywords *after* the override, otherwise they
        // will be assigned to the wrapped function (the getter)
        get.___$$keywords$$ = keywords;
    }

    Object.defineProperty(
        getMemberVisibility( members, keywords, name ),
        name,
        {
            get: get,
            set: ( set )
                ? this._overrideMethod( null, set, instCallback, cid )
                : set,

            enumerable:   true,
            configurable: false,
        }
    );
};


/**
 * Returns member prototype to use for the requested visibility
 *
 * Will throw an exception if multiple access modifiers were used.
 *
 * @param  {__visobj} members
 *
 * @param  {!Object.<boolean>}  keywords  parsed keywords
 * @param  {string}             name      member name
 *
 * @return  {Object}  reference to visibility of members argument to use
 */
function getMemberVisibility( members, keywords, name )
{
    // there's cleaner ways of doing this, but consider it loop unrolling for
    // performance
    if ( keywords[ 'private' ] )
    {
        ( keywords[ 'public' ] || keywords[ 'protected' ] )
            && viserr( name );
        return members[ 'private' ];
    }
    else if ( keywords[ 'protected' ] )
    {
        ( keywords[ 'public' ] || keywords[ 'private' ] )
            && viserr( name );
        return members[ 'protected' ];
    }
    else
    {
        // public keyword is the default, so explicitly specifying it is only
        // for clarity
        ( keywords[ 'private' ] || keywords[ 'protected' ] )
            && viserr( name );
        return members[ 'public' ];
    }
}

function viserr( name )
{
    throw TypeError(
        "Only one access modifier may be used for definition of '" +
            name + "'"
    );
}



/**
 * Scan each level of visibility for the requested member
 *
 * @param  {__visobj} members
 *
 * @param  {string}   name  member to locate
 * @param  {Object=}  base  optional base object to scan
 *
 * @return  {{get,set,member}|null}
 */
function scanMembers( members, name, base )
{
    var i      = visibility.length,
        member = null;

    // locate requested member by scanning each level of visibility
    while ( i-- )
    {
        var visobj = members[ visibility[ i ] ];

        // In order to support getters/setters, we must go off of the
        // descriptor. We must also ignore base properties (last argument), such
        // as Object.prototype.toString(). However, we must still traverse the
        // prototype chain.
        if ( member = util.getPropertyDescriptor( visobj, name, true ) )
        {
            return {
                get:        member.get,
                set:        member.set,
                member:     member.value,
            };
        }
    }

    // if a second comparison object was given, try again using it instead of
    // the original members object
    if ( base !== undefined )
    {
        var base_methods = base.___$$methods$$,
            base_props   = base.___$$props$$;

        // we must recurse on *all* the visibility objects of the base's
        // supertype; attempt to find the class associated with its
        // supertype, if any
        var base2 = ( ( base.prototype || {} ).___$$parent$$ || {} )
            .constructor;

        // scan the base's methods and properties, if they are available
        return ( base_methods && scanMembers( base_methods, name, base2 ) )
            || ( base_props && scanMembers( base_props, name, base2 ) )
            || null
        ;
    }

    // nothing was found
    return null;
}


/**
 * Hide a method with a "new" method
 */
function hideMethod( super_method, new_method, instCallback, cid )
{
    // TODO: This function is currently unimplemented. It exists at present to
    // provide a placeholder and ensure that the override keyword is required to
    // override a parent method.
    //
    // We should never get to this point if the default validation rule set is
    // used to prevent omission of the 'override' keyword.
    throw Error(
        'Method hiding not yet implemented (we should never get here; bug).'
    );
}


/**
 * Create a method that proxies to the method of another object
 *
 * @param  {string}  proxy_to  name of property (of instance) to proxy to
 *
 * @param  {Function}  instCallback  function to call in order to retrieve
 *                                   object to bind 'this' keyword to
 *
 * @param  {number}  cid       class id
 * @param  {string}  mname     name of method to invoke on destination object
 * @param  {Object}  keywords  method keywords
 *
 * @return  {Function}  proxy method
 */
exports._createProxy = function( proxy_to, instCallback, cid, mname, keywords )
{
    return this._wrapProxy.wrapMethod(
        proxy_to, null, cid, instCallback, mname, keywords
    );
};


/**
 * Generates a method override function
 *
 * The override function simply wraps the method so that its invocation will
 * pass a __super property. This property may be used to invoke the overridden
 * method.
 *
 * @param  {function()}  super_method      method to override
 * @param  {function()}  new_method        method to override with
 *
 * @param  {Function}  instCallback  function to call in order to retrieve
 *                                   object to bind 'this' keyword to
 *
 * @param  {number}   cid  class id
 *
 * @return  {function()}  override method
 */
exports._overrideMethod = function(
    super_method, new_method, instCallback, cid
)
{
    instCallback = instCallback || function() {};

    // return a function that permits referencing the super method via the
    // __super property
    var override = null;

    // are we overriding?
    override = (
        ( super_method )
            ? this._wrapOverride
            : this._wrapMethod
        ).wrapMethod( new_method, super_method, cid, instCallback );

    // This is a trick to work around the fact that we cannot set the length
    // property of a function. Instead, we define our own property - __length.
    // This will store the expected number of arguments from the super method.
    // This way, when a method is being overridden, we can check to ensure its
    // compatibility with its super method.
    util.defineSecureProp( override,
        '__length',
        ( new_method.__length || new_method.length )
    );

    return override;
}


/**
 * Return the visibility level as a numeric value, where 0 is public and 2 is
 * private
 *
 * @param  {Object}  keywords  keywords to scan for visibility level
 *
 * @return  {number}  visibility level as a numeric value
 */
exports._getVisibilityValue = function( keywords )
{
    if ( keywords[ 'protected' ] )
    {
        return 1;
    }
    else if ( keywords[ 'private' ] )
    {
        return 2;
    }
    else
    {
        // default is public
        return 0;
    }
}


/**
 * End member run and perform post-processing on state data
 *
 * A ``member run'' should consist of the members required for a particular
 * object (class/interface/etc). This action will perform validation
 * post-processing if a validator is available.
 *
 * @param  {Object}  state  member run state
 *
 * @return  {undefined}
 */
exports.end = function( state )
{
    this._validate && this._validate.end( state );
};

},{"./util":16}],5:[function(require,module,exports){
/**
 * Validation rules for members
 *
 *  Copyright (C) 2011, 2012, 2013, 2014, 2015 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

module.exports = exports = function MemberBuilderValidator( warn_handler )
{
    // permit omitting 'new' keyword
    if ( !( this instanceof module.exports ) )
    {
        return new module.exports( warn_handler );
    }

    this._warningHandler = warn_handler || function() {};
};


/**
 * Initialize validation state if not already done
 *
 * @param  {Object}  state  validation state
 *
 * @return  {Object}  provided state object STATE
 */
exports.prototype._initState = function( state )
{
    if ( state.__vready ) return state;

    state.warn = {};
    state.__vready = true;
    return state;
};


/**
 * Perform post-processing on and invalidate validation state
 *
 * All queued warnings will be triggered.
 *
 * @param  {Object}  state  validation state
 *
 * @return  {undefined}
 */
exports.prototype.end = function( state )
{
    // trigger warnings
    for ( var f in state.warn )
    {
        var warns = state.warn[ f ];
        for ( var id in warns )
        {
            this._warningHandler( warns[ id ] );
        }
    }

    state.__vready = false;
};


/**
 * Enqueue warning within validation state
 *
 * @param  {Object}   state   validation state
 * @param  {string}   member  member name
 * @param  {string}   id      warning identifier
 * @param  {Warning}  warn    warning
 *
 * @return  {undefined}
 */
function _addWarn( state, member, id, warn )
{
    ( state.warn[ member ] = state.warn[ member ] || {} )[ id ] = warn;
}


/**
 * Remove warning from validation state
 *
 * @param  {Object}   state   validation state
 * @param  {string}   member  member name
 * @param  {string}   id      warning identifier
 *
 * @return  {undefined}
 */
function _clearWarn( state, member, id, warn )
{
    delete ( state.warn[ member ] || {} )[ id ];
}


/**
 * Validates a method declaration, ensuring that keywords are valid,
 * overrides make sense, etc.
 *
 * Throws exception on validation failure. Warnings are stored in the state
 * object for later processing. The state object will be initialized if it
 * has not been already; for the initial validation, the state object should
 * be empty.
 *
 * @param  {string}  name  method name
 * @param  {*}       value method value
 *
 * @param  {Object.<string,boolean>}  keywords  parsed keywords
 *
 * @param  {Object}  prev_data      data of member being overridden
 * @param  {Object}  prev_keywords  keywords of member being overridden
 *
 * @param  {Object}  state  pre-initialized state object
 *
 * @return {undefined}
 */
exports.prototype.validateMethod = function(
    name, value, keywords, prev_data, prev_keywords, state
)
{
    this._initState( state );

    var prev = ( prev_data ) ? prev_data.member : null;

    if ( keywords[ 'abstract' ] )
    {
        // do not permit private abstract methods (doesn't make sense, since
        // they cannot be inherited/overridden)
        if ( keywords[ 'private' ] )
        {
            throw TypeError(
                "Method '" + name + "' cannot be both private and abstract"
            );
        }
    }

    // const doesn't make sense for methods; they're always immutable
    if ( keywords[ 'const' ] )
    {
        throw TypeError(
            "Cannot declare method '" + name + "' as constant; keyword is " +
            "redundant"
        );
    }

    // virtual static does not make sense, as static methods cannot be
    // overridden
    if ( keywords[ 'virtual' ] && ( keywords[ 'static' ] ) )
    {
        throw TypeError(
            "Cannot declare static method '" + name + "' as virtual"
        );
    }

    // do not allow overriding getters/setters
    if ( prev_data && ( prev_data.get || prev_data.set ) )
    {
        throw TypeError(
            "Cannot override getter/setter '" + name + "' with method"
        );
    }

    if ( keywords[ 'proxy' ] )
    {
        // proxies are expected to provide the name of the destination object
        if ( typeof value !== 'string' )
        {
            throw TypeError(
                "Cannot declare proxy method '" + name + "'; string value " +
                    "expected"
            );
        }
        else if ( keywords[ 'abstract' ] )
        {
            // proxies are always concrete
            throw TypeError(
                "Proxy method '" + name + "' cannot be abstract"
            );
        }
    }

    // search for any previous instances of this member
    if ( prev )
    {
        // perform this check first, as it will make more sense than those that
        // follow, should this condition be satisfied
        if ( prev_keywords[ 'private' ] )
        {
            throw TypeError(
                "Private member name '" + name + "' conflicts with supertype"
            );
        }

        // disallow overriding properties with methods
        if ( !( typeof prev === 'function' ) )
        {
            throw TypeError(
                "Cannot override property '" + name + "' with method"
            );
        }

        // disallow overriding non-virtual methods
        if ( keywords[ 'override' ] && !( prev_keywords[ 'virtual' ] ) )
        {
            if ( !( keywords[ 'abstract' ] ) )
            {
                throw TypeError(
                    "Cannot override non-virtual method '" + name + "'"
                );
            }

            // at this point, we have `abstract override'
            if ( !( prev_keywords[ 'abstract' ] ) )
            {
                // TODO: test me
                throw TypeError(
                    "Cannot perform abstract override on non-abstract " +
                    "method '" + name + "'"
                );
            }
        }

        // do not allow overriding concrete methods with abstract unless the
        // abstract method is weak
        if ( ( keywords[ 'abstract' ] && !keywords[ 'override' ] )
            && !( keywords.weak )
            && !( prev_keywords[ 'abstract' ] )
        )
        {
            throw TypeError(
                "Cannot override concrete method '" + name + "' with " +
                    "abstract method"
            );
        }


        var lenprev = ( prev.__length === undefined )
            ? prev.length
            : prev.__length;

        var lennow = ( value.__length === undefined )
            ? value.length
            : value.__length;

        if ( keywords[ 'proxy' ] )
        {
            // otherwise we'd be checking against the length of a string.
            lennow = NaN;
        }

        if ( keywords.weak && !( prev_keywords[ 'abstract' ] ) )
        {
            // weak abstract declaration found after its concrete
            // definition; check in reverse order
            var tmp = lenprev;
            lenprev = lennow;
            lennow = tmp;
        }

        // ensure parameter list is at least the length of its supertype
        if ( lennow < lenprev )
        {
            throw TypeError(
                "Declaration of method '" + name + "' must be compatible " +
                    "with that of its supertype"
            );
        }

        // do not permit visibility deescalation
        if ( this._getVisibilityValue( prev_keywords ) <
            this._getVisibilityValue( keywords )
        )
        {
            throw TypeError(
                "Cannot de-escalate visibility of method '" + name + "'"
            );
        }

        // Disallow overriding method without override keyword (unless
        // parent method is abstract). In the future, this will provide a
        // warning to default to method hiding. Note the check for a
        if ( !( keywords[ 'override' ]
            || prev_keywords[ 'abstract' ]
            || keywords.weak
        ) )
        {
            throw TypeError(
                "Attempting to override method '" + name +
                "' without 'override' keyword"
            );
        }

        // prevent non-override warning
        if ( keywords.weak && prev_keywords[ 'override' ] )
        {
            _clearWarn( state, name, 'no' );
        }
    }
    else if ( keywords[ 'override' ] )
    {
        // using the override keyword without a super method may indicate a bug,
        // but it shouldn't stop the class definition (it doesn't adversely
        // affect the functionality of the class, unless of course the method
        // attempts to reference a supertype)
        _addWarn( state, name, 'no', Error(
            "Method '" + name +
            "' using 'override' keyword without super method"
        ) );
    }
};


/**
 * Validates a property declaration, ensuring that keywords are valid, overrides
 * make sense, etc.
 *
 * Throws exception on validation failure
 *
 * @param  {string}  name  method name
 * @param  {*}       value method value
 *
 * @param  {Object.<string,boolean>}  keywords  parsed keywords
 *
 * @param  {Object}  prev_data      data of member being overridden
 * @param  {Object}  prev_keywords  keywords of member being overridden
 *
 * @return {undefined}
 */
exports.prototype.validateProperty = function(
    name, value, keywords, prev_data, prev_keywords
)
{
    var prev = ( prev_data ) ? prev_data.member : null;

    // do not permit visibility de-escalation
    if ( prev )
    {
        // perform this check first, as it will make more sense than those that
        // follow, should this condition be satisfied
        if ( prev_keywords[ 'private' ] )
        {
            throw TypeError(
                "Private member name '" + name + "' conflicts with supertype"
            );
        }

        // disallow overriding methods with properties
        if ( typeof prev === 'function' )
        {
            throw new TypeError(
                "Cannot override method '" + name + "' with property"
            );
        }

        if ( this._getVisibilityValue( prev_keywords )
            < this._getVisibilityValue( keywords )
        )
        {
            throw TypeError(
                "Cannot de-escalate visibility of property '" + name + "'"
            );
        }
    }

    // do not allow overriding getters/setters
    if ( prev_data && ( prev_data.get || prev_data.set ) )
    {
        throw TypeError(
            "Cannot override getter/setter '" + name + "' with property"
        );
    }

    // abstract properties do not make sense
    if ( keywords[ 'abstract' ] )
    {
        throw TypeError(
            "Property '" + name + "' cannot be declared as abstract"
        );
    }

    // constants are static
    if ( keywords[ 'static' ] && keywords[ 'const' ] )
    {
        throw TypeError(
            "Static keyword cannot be used with const for property '" +
            name + "'"
        );
    }

    // properties are inherently virtual
    if ( keywords['virtual'] )
    {
        throw TypeError( "Cannot declare property '" + name + "' as virtual" );
    }
};


/**
 * Performs common validations on getters/setters
 *
 * If a problem is found, an exception will be thrown.
 *
 * @param  {string}                   name      getter/setter name
 * @param  {Object.<string,boolean>}  keywords  parsed keywords
 *
 * @return {undefined}
 */
exports.prototype.validateGetterSetter = function(
    name, value, keywords, prev_data, prev_keywords
)
{
    var prev    = ( prev_data ) ? prev_data.member : null,
        prev_gs = ( ( prev_data && ( prev_data.get || prev_data.set ) )
            ? true
            : false
        )
    ;

    // abstract getters/setters are not yet supported
    if ( keywords[ 'abstract' ] )
    {
        throw TypeError(
            "Cannot declare getter/setter '" + name + "' as abstract"
        );
    }

    // for const getters/setters, omit the setter
    if ( keywords[ 'const' ] )
    {
        throw TypeError(
            "Cannot declare const getter/setter '" + name + "'"
        );
    }

    // virtual static does not make sense, as static methods cannot be
    // overridden
    if ( keywords[ 'virtual' ] && ( keywords[ 'static' ] ) )
    {
        throw TypeError(
            "Cannot declare static method '" + name + "' as virtual"
        );
    }

    if ( prev || prev_gs )
    {
        // perform this check first, as it will make more sense than those that
        // follow, should this condition be satisfied
        if ( prev_keywords && prev_keywords[ 'private' ] )
        {
            throw TypeError(
                "Private member name '" + name + "' conflicts with supertype"
            );
        }

        // To speed up the system we'll simply check for a getter/setter, rather
        // than checking separately for methods/properties. This is at the
        // expense of more detailed error messages. They'll live.
        if ( !( prev_gs ) )
        {
            throw TypeError(
                "Cannot override method or property '" + name +
                    "' with getter/setter"
            );
        }

        if ( !( prev_keywords && prev_keywords[ 'virtual' ] ) )
        {
            throw TypeError(
                "Cannot override non-virtual getter/setter '" + name + "'"
            );
        }

        if ( !( keywords[ 'override' ] ) )
        {
            throw TypeError(
                "Attempting to override getter/setter '" + name +
                "' without 'override' keyword"
            );
        }

        // do not permit visibility de-escalation
        if ( this._getVisibilityValue( prev_keywords || {} )
            < this._getVisibilityValue( keywords )
        )
        {
            throw TypeError(
                "Cannot de-escalate visibility of getter/setter '" + name + "'"
            );
        }
    }
    else if ( keywords[ 'override' ] )
    {
        // using the override keyword without a super method may indicate a bug
        // in the user's code
        this._warningHandler( Error(
            "Getter/setter '" + name +
            "' using 'override' keyword without super getter/setter"
        ) );
    }
}


/**
 * Return the visibility level as a numeric value, where 0 is public and 2 is
 * private
 *
 * @param  {Object}  keywords  keywords to scan for visibility level
 *
 * @return  {number}  visibility level as a numeric value
 */
exports.prototype._getVisibilityValue = function( keywords )
{
    if ( keywords[ 'protected' ] )
    {
        return 1;
    }
    else if ( keywords[ 'private' ] )
    {
        return 2;
    }
    else
    {
        // default is public
        return 0;
    }
}


},{}],6:[function(require,module,exports){
/**
 * Builds method wrappers
 *
 *  Copyright (C) 2011, 2012, 2013 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Initializes factory to wrap methods
 *
 * @param  {function(Function,Function,number)}  factory  function that will
 *                                                        perform the actual
 *                                                        wrapping
 *
 * @constructor
 */
module.exports = exports = function MethodWrapperFactory( factory )
{
    // permit omission of the 'new' keyword for instantiation
    if ( !( this instanceof exports ) )
    {
        // module.exports for Closure Compiler
        return new module.exports( factory );
    }

    this._factory = factory;
};


/**
 * Wraps the provided method
 *
 * The returned function is determined by the factory function provided when the
 * MethodWrapperFactory was instantiated.
 *
 * @param  {function()}  method        method to wrap
 * @param  {function()}  super_method  super method, if overriding
 * @param  {number}      cid           class id that method is associated with
 * @param  {function()}  getInst       function to determine instance and return
 *                                     associated visibility object
 * @param  {string=}     name          name of method
 * @param  {Object=}     keywords      method keywords
 */
exports.prototype.wrapMethod = function(
    method, super_method, cid, getInst, name, keywords
)
{
    return this._factory( method, super_method, cid, getInst, name, keywords );
};


},{}],7:[function(require,module,exports){
/**
 * Default method wrapper functions
 *
 *  Copyright (C) 2011, 2012, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Method wrappers for standard (non-fallback)
 * @type {Object}
 */
exports.standard = {
    wrapOverride: function( method, super_method, cid, getInst )
    {
        var retf = function()
        {
            // we need some sort of context in order to set __super; it may
            // be undefined per strict mode requirements depending on how
            // the method was invoked
            var context = getInst( this, cid ) || this || {},
                retval  = undefined
            ;

            // the _super property will contain the parent method (store the
            // previous value to ensure that calls to multiple overrides will
            // be supported)
            var psup = context.__super;
            context.__super = super_method;

            retval = method.apply( context, arguments );

            // prevent sneaky bastards from breaking encapsulation by stealing
            // method references and ensure that __super is properly restored
            // for nested/multiple override invocations
            context.__super = psup;

            // if the value returned from the method was the context that we
            // passed in, return the actual instance (to ensure we do not break
            // encapsulation)
            if ( retval === context )
            {
                return this;
            }

            return retval;
        };

        // `super` is reserved and, in ES3, this causes problems with the
        // dot-notation; while `foo.super` will work fine in modern (ES5)
        // browsers, we need to maintain our ES3 compatibility
        retf['super'] = super_method;

        return retf;
    },


    wrapNew: function( method, super_method, cid, getInst )
    {
        return function()
        {
            var context = getInst( this, cid ) || this,
                retval  = undefined
            ;

            // invoke the method
            retval = method.apply( context, arguments );

            // if the value returned from the method was the context that we
            // passed in, return the actual instance (to ensure we do not break
            // encapsulation)
            if ( retval === context )
            {
                return this;
            }

            return retval;
        };
    },


    wrapProxy: function( proxy_to, _, cid, getInst, name, keywords )
    {
        // it is important that we store only a boolean value as to whether or
        // not this method is static *outside* of the returned closure, so as
        // not to keep an unnecessary reference to the keywords object
        var is_static = keywords && keywords[ 'static' ];

        var ret = function()
        {
            var context = getInst( this, cid ) || this,
                retval  = undefined,
                dest    = ( ( is_static )
                    ? context.$( proxy_to )
                    : context[ proxy_to ]
                )
            ;

            // rather than allowing a cryptic error to be thrown, attempt to
            // detect when the proxy call will fail and provide a useful error
            // message
            if ( !( ( dest !== null ) && ( typeof dest === 'object' )
                && ( typeof dest[ name ] === 'function' )
            ) )
            {
                throw TypeError(
                    "Unable to proxy " + name + "() call to '" + proxy_to +
                    "'; '" + proxy_to + "' is undefined or '" + name +
                    "' is not a function."
                );
            }

            retval = dest[ name ].apply( dest, arguments );

            // if the object we are proxying to returns itself, then instead
            // return a reference to *ourself* (so as not to break encapsulation
            // and to provide a more consistent and sensible API)
            return ( retval === dest )
                ? this
                : retval;
        };

        // ensures that proxies can be used to provide concrete
        // implementations of abstract methods with param requirements (we
        // have no idea what we'll be proxying to at runtime, so we need to
        // just power through it; see test case for more info)
        ret.__length = NaN;
        return ret;
    },
};


},{}],8:[function(require,module,exports){
/**
 * Provides system for code reuse via traits
 *
 *  Copyright (C) 2014, 2015 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var AbstractClass = require( './class_abstract' ),
    ClassBuilder  = require( './ClassBuilder' ),
    Interface     = require( './interface' );


function _fvoid() {};


/**
 * Trait constructor / base object
 *
 * The interpretation of the argument list varies by number. Further,
 * various trait methods may be used as an alternative to invoking this
 * constructor.
 *
 * @return  {Function}  trait
 */
function Trait()
{
    switch ( arguments.length )
    {
        case 0:
            throw Error( "Missing trait name or definition" );

        case 1:
            return ( typeof arguments[ 0 ] === 'string' )
                ? _createStaging.apply( this, arguments )
                : Trait.extend.apply( this, arguments );

        case 2:
            return createNamedTrait.apply( this, arguments );
    }

    throw Error(
        "Expecting at most two arguments for definition of named " +
            "Trait " + name + "'; " + arguments.length + " given"
    );
};


/**
 * Create a named trait
 *
 * @param  {string}  name  trait name
 * @param  {Object}  def   trait definition
 *
 * @return  {Function}  named trait
 */
function createNamedTrait( name, dfn )
{
    if ( typeof name !== 'string' )
    {
        throw Error(
            "First argument of named class definition must be a string"
        );
    }

    dfn.__name = name;
    return Trait.extend( dfn );
}


function _createStaging( name )
{
    return {
        extend: function( dfn )
        {
            return createNamedTrait( name, dfn );
        },

        implement: function()
        {
            return createImplement( arguments, name );
        },
    };
}


Trait.extend = function( /* ... */ )
{
    var an           = arguments.length,
        dfn          = arguments[ an - 1 ],
        has_ext_base = ( an > 1 ),
        ext_base     = ( has_ext_base ) ? arguments[ 0 ] : null;

    if ( an > 2 )
    {
        throw Error(
            "Unexpected number of arguments to Trait.extend"
        );
    }

    if ( has_ext_base )
    {
        var basetype = typeof ext_base;

        if ( ( ext_base === null )
             || !( ( basetype === 'object' )
                   || ( basetype === 'function' )
        ) )
        {
            throw TypeError(
                "Trait cannot extend base of type '" + basetype + "'"
            );
        }

        // prevent extending final classes (TODO: abstract this check; see
        // also ClassBuilder)
        if ( ext_base.___$$final$$ === true )
        {
            throw TypeError(
                "Trait cannot extend final class"
            );
        }

        // TODO: this is intended to be temporary; see Trait/ClassExtendTest
        if ( module.exports.isTrait( ext_base ) )
        {
            throw TypeError( "Traits cannot extend other traits" );
        }
    }

    // we may have been passed some additional metadata
    var meta = ( this || {} ).__$$meta || {};

    // store any provided name, since we'll be clobbering it (the definition
    // object will be used to define the hidden abstract class)
    var name    = dfn.__name || '(Trait)',
        type    = _getTraitType( dfn ),
        isparam = ( type === 'param' );

    // augment the parser to handle our own oddities
    dfn.___$$parser$$ = {
        each:     _parseMember,
        property: _parseProps,
        getset:   _parseGetSet,
    };

    // automatically mark ourselves as abstract if an abstract method is
    // provided
    dfn.___$$auto$abstract$$ = true;

    // give the abstract trait class a distinctive name for debugging
    dfn.__name = '#AbstractTrait#';

    // if __mixin was provided,in the definition, then we should crate a
    // paramaterized trait
    var Trait = ( isparam )
        ? function ParameterTraitType()
        {
            // duplicate ars in a way that v8 can optimize
            var args = [], i = arguments.length;
            while ( i-- ) args[ i ] = arguments[ i ];

            var AT = function ArgumentTrait()
            {
                throw Error( "Cannot re-configure argument trait" );
            };

            // TODO: mess!
            AT.___$$mixinargs = args;
            AT.__trait        = 'arg';
            AT.__acls         = Trait.__acls;
            AT.__ccls         = Trait.__ccls;
            AT.toString       = Trait.toString;
            AT.__mixinImpl    = Trait.__mixinImpl;
            AT.__isInstanceOf = Trait.__isInstanceOf;

            // mix in the argument trait instead of the original
            AT.__mixin = function( dfn, tc, base )
            {
                mixin( AT, dfn, tc, base );
            };

            return AT;
        }
        : function TraitType()
        {
            throw Error( "Cannot instantiate non-parameterized trait" );
        };

    // implement interfaces if indicated
    var base = AbstractClass;
    if ( meta.ifaces )
    {
        base = base.implement.apply( null, meta.ifaces );
    }

    // and here we can see that traits are quite literally abstract classes
    var tclass = ( ext_base )
        ? base.extend( ext_base, dfn )
        : base.extend( dfn );

    Trait.__trait   = type;
    Trait.__acls    = tclass;
    Trait.__ccls    = null;
    Trait.__extbase = ext_base;
    Trait.toString  = function()
    {
        return ''+name;
    };

    // we're not a param trait, but we want consistent data
    Trait.___$$mixinargs = [];

    // invoked to trigger mixin
    Trait.__mixin = function( dfn, tc, base )
    {
        mixin( Trait, dfn, tc, base );
    };

    // mixes in implemented types
    Trait.__mixinImpl = function( dest_meta )
    {
        mixinImpl( tclass, dest_meta );
    };

    // TODO: this and the above should use util.defineSecureProp
    Trait.__isInstanceOf = Interface.isInstanceOf;

    return Trait;
};


/**
 * Validate whether mixin is permitted
 *
 * If a mixee (the trait being mixed in) extends some type S, then a
 * contract has been created mandating that that trait may only be mixed
 * into something of type S; a `TypeError` will be thrown if this contract
 * is violated.
 *
 * @param  {Class}  base  mixor (target of mixin)
 * @param  {Trait}  T     mixee (trait being mixed in)
 *
 * @return  {undefined}
 *
 * @throws  {TypeError}  on type contract violation
 */
function _validateMixin( base, T )
{
    if ( !T.__extbase )
    {
        return;
    }

    // TODO: isSubtypeOf
    if ( !( ( T.__extbase === base )
            || ClassBuilder.isInstanceOf( T.__extbase, base.asPrototype() )
    ) )
    {
        throw TypeError(
            "Cannot mix trait " + T.toString() + " into " + base.toString() +
                "; mixor must be of type " + T.__extbase.toString()
        );
    }
}


/**
 * Retrieve a string representation of the trait type
 *
 * A trait is parameterized if it has a __mixin method; otherwise, it is
 * standard.
 *
 * @param   {Object}  dfn  trait definition object
 * @return  {string}  trait type
 */
function _getTraitType( dfn )
{
    return ( typeof dfn.__mixin === 'function' )
        ? 'param'
        : 'std';
}


/**
 * Verifies trait member restrictions
 *
 * @param  {string}   name      property name
 * @param  {*}        value     property value
 * @param  {Object}   keywords  property keywords
 * @param  {Function} h         original handler that we replaced
 *
 * @return  {undefined}
 */
function _parseMember( name, value, keywords, h )
{
    // traits are not permitted to define constructors
    if ( name === '__construct' )
    {
        throw Error( "Traits may not define __construct" );
    }

    // will be supported in future versions
    if ( keywords['static'] )
    {
        throw Error(
            "Cannot define member `" + name + "'; static trait " +
            "members are currently unsupported"
        );
    }

    // apply original handler
    h.apply( this, arguments );
}


/**
 * Throws error if non-internal property is found within PROPS
 *
 * For details and rationale, see the Trait/PropertyTest case.
 *
 * @param  {string}   name      property name
 * @param  {*}        value     property value
 * @param  {Object}   keywords  property keywords
 * @param  {Function} h         original handler that we replaced
 *
 * @return  {undefined}
 */
function _parseProps( name, value, keywords, h )
{
    // ignore internal properties
    if ( name.substr( 0, 3 ) === '___' )
    {
        return;
    }

    if ( !( keywords['private'] ) )
    {
        throw Error(
            "Cannot define property `" + name + "'; only private " +
            "properties are permitted within Trait definitions"
        );
    }

    // apply original handler
    h.apply( this, arguments );
}


/**
 * Immediately throws an exception, as getters/setters are unsupported
 *
 * This is a temporary restriction; they will be supported in future
 * releases.
 *
 * @param  {string}   name      property name
 * @param  {*}        value     property value
 * @param  {Object}   keywords  property keywords
 * @param  {Function} h         original handler that we replaced
 *
 * @return  {undefined}
 */
function _parseGetSet( name, value, keywords, h )
{
    throw Error(
        "Cannot define property `" + name + "'; getters/setters are " +
        "currently unsupported"
    );
}


/**
 * Implement one or more interfaces
 *
 * Implementing an interface into a trait has the same effect as it does
 * within classes in that it will automatically define abstract methods
 * unless a concrete method is provided. Further, the class that the trait
 * is mixed into will act as though it implemented the interfaces.
 *
 * @param  {...Function}  interfaces  interfaces to implement
 *
 * @return  {Object}  staged trait object
 */
Trait.implement = function()
{
    return createImplement( arguments );
};


/**
 * Create a staging object from which a trait implementing a set of
 * interfaces may be defined
 *
 * @param  {...Function}  interfaces  interfaces to implement
 * @param  {string=}      name        optional trait name
 *
 * @return  {Object}  staged trait object
 */
function createImplement( ifaces, name )
{
    return {
        extend: function( dfn )
        {
            if ( name )
            {
                dfn.__name = name;
            }

            // pass our interface metadata as the invocation context
            return Trait.extend.call(
                { __$$meta: { ifaces: ifaces } },
                dfn
            );
        },
    };
}


/**
 * Determines if the provided value references a trait
 *
 * @param   {*}        trait  value to check
 * @return  {boolean}  whether the provided value references a trait
 */
Trait.isTrait = function( trait )
{
    return !!( trait || {} ).__trait;
};


/**
 * Determines if the provided value references a parameterized trait
 *
 * @param   {*}        trait  value to check
 * @return  {boolean}  whether the provided value references a param trait
 */
Trait.isParameterTrait = function( trait )
{
    return !!( ( trait || {} ).__trait === 'param' );
};


/**
 * Determines if the provided value references an argument trait
 *
 * An argument trait is a configured parameter trait.
 *
 * @param   {*}        trait  value to check
 * @return  {boolean}  whether the provided value references an arg trait
 */
Trait.isArgumentTrait = function( trait )
{
    return !!( ( trait || {} ).__trait === 'arg' );
};


/**
 * Create a concrete class from the abstract trait class
 *
 * This class is the one that will be instantiated by classes that mix in
 * the trait.
 *
 * @param  {AbstractClass}  acls  abstract trait class
 *
 * @return  {Class}  concrete trait class for instantiation
 */
function createConcrete( acls )
{
    // start by providing a concrete implementation for our dummy method and
    // a constructor that accepts the protected member object of the
    // containing class
    var dfn = {
        // protected member object (we define this as protected so that the
        // parent ACLS has access to it (!), which is not prohibited since
        // JS does not provide a strict typing mechanism...this is a kluge)
        // and target supertype---that is, what __super calls should
        // referene
        'protected ___$$pmo$$': null,
        'protected ___$$super$$': null,
        __construct: function( base, pmo )
        {
            this.___$$super$$ = base;
            this.___$$pmo$$   = pmo;
        },

        // mainly for debugging; should really never see this.
        __name: '#ConcreteTrait#',
    };

    // every abstract method should be overridden with a proxy to the
    // protected member object that will be passed in via the ctor
    var amethods = ClassBuilder.getMeta( acls ).abstractMethods;
    for ( var f in amethods )
    {
        // TODO: would be nice if this check could be for '___'; need to
        // replace amethods.__length with something else, then
        if ( !( Object.hasOwnProperty.call( amethods, f ) )
            || ( f.substr( 0, 2 ) === '__' )
        )
        {
            continue;
        }

        // we know that if it's not public, then it must be protected
        var vis = ( acls.___$$methods$$['public'][ f ] !== undefined )
            ? 'public'
            : 'protected';

        // setting the correct visibility modified is important to prevent
        // visibility de-escalation errors if a protected concrete method is
        // provided
        dfn[ vis + ' proxy ' + f ] = '___$$pmo$$';
    }

    // virtual methods need to be handled with care to ensure that we invoke
    // any overrides
    createVirtProxy( acls, dfn );

    return acls.extend( dfn );
}


/**
 * Create virtual method proxies for all virtual members
 *
 * Virtual methods are a bit of hassle with traits: we are in a situation
 * where we do not know at the time that the trait is created whether or not
 * the virtual method has been overridden, since the class that the trait is
 * mixed into may do the overriding. Therefore, we must check if an override
 * has occured *when the method is invoked*; there is room for optimization
 * there (by making such a determination at the time of mixin), but we'll
 * leave that for later.
 *
 * @param  {AbstractClass}  acls  abstract trait class
 * @param  {Object}         dfn   destination definition object
 *
 * @return  {undefined}
 */
function createVirtProxy( acls, dfn )
{
    var vmembers = ClassBuilder.getMeta( acls ).virtualMembers;

    // f = `field'
    for ( var f in vmembers )
    {
        var vis = ( acls.___$$methods$$['public'][ f ] !== undefined )
            ? 'public'
            : 'protected';

        var srcmethod = acls.___$$methods$$[ vis ][ f ],
            plen      = srcmethod.__length;

        // this is the aforementioned proxy method; see the docblock for
        // more information
        dfn[ vis + ' virtual override ' + f ] = ( function( f )
        {
            var retf = function()
            {
                var pmo = this.___$$pmo$$,
                    o   = pmo[ f ];

                // proxy to virtual override from the class we are mixed
                // into, if found; otherwise, proxy to our supertype
                return ( o )
                    ? o.apply( pmo, arguments )
                    : this.__super.apply( this, arguments );
            };

            retf.__length = plen;
            return retf;
        } )( f );

        // this guy bypasses the above virtual override check, which is
        // necessary in certain cases to prevent infinte recursion
        dfn[ vis + ' virtual __$$' + f ] = ( function( method )
        {
            var retf = function()
            {
                return method.apply( this, arguments );
            };

            retf.__length = plen;
            return retf;
        } )( srcmethod );
    }
}


/**
 * Mix trait into the given definition
 *
 * The original object DFN is modified; it is not cloned. TC should be
 * initialized to an empty array; it is used to store context data for
 * mixing in traits and will be encapsulated within a ctor closure (and thus
 * will remain in memory).
 *
 * @param  {Trait}   trait  trait to mix in
 * @param  {Object}  dfn    definition object to merge into
 * @param  {Array}   tc     trait class context
 * @param  {Class}   base   target supertype
 *
 * @return  {Object}  dfn
 */
function mixin( trait, dfn, tc, base )
{
    _validateMixin( base, trait );

    // the abstract class hidden within the trait
    var acls = trait.__acls;

    // retrieve the private member name that will contain this trait object
    var iname = addTraitInst( trait, dfn, tc, base );

    // TODO: this should not be necessary for dfn metadata
    dfn[ 'weak virtual ___$$ctor$pre$$' ]  = _fvoid;
    dfn[ 'weak virtual ___$$ctor$post$$' ] = _fvoid;

    // TODO: this is a kluge; generalize and move
    // this ensures __construct is called before __mixin when mixing into
    // the base class
    if ( base === ClassBuilder.ClassBase )
    {
        dfn[ 'virtual override ___$$ctor$post$$' ] = _tctorApply;
        dfn[ 'virtual override ___$$ctor$pre$$' ]  = _fvoid;
    }
    else
    {
        dfn[ 'virtual override ___$$ctor$post$$' ]  = _fvoid;
        dfn[ 'virtual override ___$$ctor$pre$$' ] = _tctorApply;
    }

    // recursively mix in trait's underlying abstract class (ensuring that
    // anything that the trait inherits from is also properly mixed in)
    mixinCls( acls, dfn, iname );
    return dfn;
}


/**
 * Recursively mix in class methods
 *
 * If CLS extends another class, its methods will be recursively processed
 * to ensure that the entire prototype chain is properly proxied.
 *
 * For an explanation of the iname parameter, see the mixin function.
 *
 * @param  {Class}   cls    class to mix in
 * @param  {Object}  dfn    definition object to merge into
 * @param  {string}  iname  trait object private member instance name
 *
 * @return {undefined}
 */
function mixinCls( cls, dfn, iname, inparent )
{
    var methods = cls.___$$methods$$;

    mixMethods( methods['public'], dfn, 'public', iname, inparent );
    mixMethods( methods['protected'], dfn, 'protected', iname, inparent );

    // if this class inherits from another class that is *not* the base
    // class, recursively process its methods; otherwise, we will have
    // incompletely proxied the prototype chain
    var parent = methods['public'].___$$parent$$;
    if ( parent && ( parent.constructor !== ClassBuilder.ClassBase ) )
    {
        mixinCls( parent.constructor, dfn, iname, true );
    }
}


/**
 * Mix implemented types into destination object
 *
 * The provided destination object will ideally be the `implemented' array
 * of the destination class's meta object.
 *
 * @param  {Class}   cls        source class
 * @param  {Object}  dest_meta  destination object to copy into
 *
 * @return {undefined}
 */
function mixinImpl( cls, dest_meta )
{
    var impl = ClassBuilder.getMeta( cls ).implemented || [],
        i    = impl.length;

    while ( i-- )
    {
        // TODO: this could potentially result in duplicates
        dest_meta.push( impl[ i ] );
    }
}


/**
 * Mix methods from SRC into DEST using proxies
 *
 * @param  {Object}  src    visibility object to scavenge from
 * @param  {Object}  dest   destination definition object
 * @param  {string}  vis    visibility modifier
 * @param  {string}  iname  proxy destination (trait instance)
 *
 * @return  {undefined}
 */
function mixMethods( src, dest, vis, iname, inparent )
{
    for ( var f in src )
    {
        if ( !( Object.hasOwnProperty.call( src, f ) ) )
        {
            continue;
        }

        // TODO: generalize
        // __mixin is exclusive to the trait (private-ish, but can be
        // invoked publically internally)
        if ( f === '__mixin' )
        {
            continue;
        }

        // TODO: this is a kluge; we'll use proper reflection eventually,
        // but for now, this is how we determine if this is an actual method
        // vs. something that just happens to be on the visibility object
        if ( !( src[ f ] && src[ f ].___$$keywords$$ ) )
        {
            continue;
        }

        var keywords = src[ f ].___$$keywords$$;

        // TODO: This is a kluge to handle ES3 fallbacks, which will cause
        // protected members to appear on the public prototype.  A more
        // elegant solution is to automatically add the public keyword when
        // the class is built, so we can just check if keywords[vis] exists.
        if ( ( vis === 'public' ) && keywords[ 'protected' ] )
        {
            continue;
        }

        vis = keywords[ 'protected' ] ? 'protected' : 'public';

        // if abstract, then we are expected to provide the implementation;
        // otherwise, we proxy to the trait's implementation
        if ( keywords[ 'abstract' ] && !( keywords[ 'override' ] ) )
        {
            // copy the abstract definition (N.B. this does not copy the
            // param names, since that is not [yet] important); the
            // visibility modifier is important to prevent de-escalation
            // errors on override
            dest[ vis + ' weak abstract ' + f ] = src[ f ].definition;
        }
        else if ( inparent && !keywords[ 'abstract' ] )
        {
            continue;
        }
        else
        {
            var vk    = keywords['virtual'],
                virt  = vk ? 'virtual ' : '',
                ovr   = ( keywords['override'] ) ? 'override ' : '',
                pname = ( vk ? '' : 'proxy ' ) + virt + ovr + vis + ' ' + f;

            // if we have already set up a proxy for a field of this name,
            // then multiple traits have defined the same concrete member
            if ( dest[ pname ] !== undefined )
            {
                // TODO: between what traits?
                throw Error( "Trait member conflict: `" + f + "'" );
            }

            // if non-virtual, a normal proxy should do
            if ( !( keywords[ 'virtual' ] ) )
            {
                dest[ pname ] = iname;
                continue;
            }

            // proxy this method to what will be the encapsulated trait
            // object (note that we do not use the proxy keyword here
            // beacuse we are not proxying to a method of the same name)
            dest[ pname ] = ( function( f )
            {
                var retf = function()
                {
                    var pdest = this[ iname ];

                    // invoke the direct method on the trait instance; this
                    // bypasses the virtual override check on the trait
                    // method to ensure that it is invoked without
                    // additional overhead or confusion
                    var ret = pdest[ '__$$' + f ].apply( pdest, arguments );

                    // if the trait returns itself, return us instead
                    return ( ret === pdest )
                        ? this
                        : ret;
                };

                retf.__length = src[ f ].__length;
                return retf;
            } )( f );
        }
    }
}


/**
 * Add concrete trait class to a class instantion list
 *
 * This list---which will be created if it does not already exist---will be
 * used upon instantiation of the class consuming DFN to instantiate the
 * concrete trait classes.
 *
 * Here, `tc' and `to' are understood to be, respectively, ``trait class''
 * and ``trait object''.
 *
 * @param  {Class}   T     trait
 * @param  {Object}  dfn   definition object of class being mixed into
 * @param  {Array}   tc    trait class object
 * @param  {Class}   base  target supertype
 *
 * @return  {string}  private member into which C instance shall be stored
 */
function addTraitInst( T, dfn, tc, base )
{
    var base_cid = base.__cid;

    // creates a property of the form ___$to$N$M to hold the trait object
    // reference; M is required because of the private member restrictions
    // imposed to be consistent with pre-ES5 fallback
    var iname = '___$to$' + T.__acls.__cid + '$' + base_cid;

    // the trait object array will contain two values: the destination field
    // and the trait to instantiate
    tc.push( [ iname, T ] );

    // we must also add the private field to the definition object to
    // support the object assignment indicated by TC
    dfn[ 'private ' + iname ] = null;

    // create internal trait ctor if not available
    if ( dfn.___$$tctor$$ === undefined )
    {
        // TODO: let's check for inheritance or something to avoid this weak
        // definition (this prevents warnings if there is not a supertype
        // that defines the trait ctor)
        dfn[ 'weak virtual ___$$tctor$$' ] = function() {};
        dfn[ 'virtual override ___$$tctor$$' ] = createTctor( tc, base );
    }

    return iname;
}


/**
 * Trait initialization constructor
 *
 * May be used to initialize all traits mixed into the class that invokes
 * this function. All concrete trait classes are instantiated and their
 * resulting objects assigned to their rsepective pre-determined field
 * names.
 *
 * The MIXINARGS are only useful in the case of parameterized trait.
 *
 * This will lazily create the concrete trait class if it does not already
 * exist, which saves work if the trait is never used.
 *
 * Note that the private symbol used to encapsulate class data must be
 * passed to this function to provide us access to implementation details
 * that we really shouldn't be messing around with. :) In particular, we
 * need access to the protected visibility object, and there is [currently]
 * no API for doing so.
 *
 * @param  {Object}  tc       trait class list
 * @param  {Class}   base     target supertype
 * @param  {Symbol}  privsym  symbol used as key for encapsulated data
 *
 * @return  {undefined}
 */
function tctor( tc, base, privsym )
{
    // instantiate all traits and assign the object to their
    // respective fields
    for ( var t in tc )
    {
        var f = tc[ t ][ 0 ],
            T = tc[ t ][ 1 ],
            C = T.__ccls || ( T.__ccls = createConcrete( T.__acls ) );

        // instantiate the trait, providing it with our protected visibility
        // object so that it has access to our public and protected members
        // (but not private); in return, we will use its own protected
        // visibility object to gain access to its protected members...quite
        // the intimate relationship
        this[ f ] = C( base, this[ privsym ].vis )[ privsym ].vis;

        // this has been previously validated to ensure that it is a
        // function
        this[ f ].__mixin && this[ f ].__mixin.apply(
            this[ f ], T.___$$mixinargs
        );
    }

    // if we are a subtype, be sure to initialize our parent's traits
    this.__super && this.__super( privsym );
};


/**
 * Create trait constructor
 *
 * This binds the generic trait constructor to a reference to the provided
 * trait class list.
 *
 * @param  {Object}  tc    trait class list
 * @param  {Class}   base  target supertype
 *
 * @return  {function()}  trait constructor
 */
function createTctor( tc, base )
{
    return function( privsym )
    {
        return tctor.call( this, tc, base, privsym );
    };
}


function _tctorApply()
{
    this.___$$tctor$$.apply( this, arguments );
}


module.exports = Trait;


},{"./ClassBuilder":2,"./class_abstract":12,"./interface":14}],9:[function(require,module,exports){
/**
 * Contains visibility object factory
 *
 *  Copyright (C) 2011, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * XXX: tightly coupled
 */
var util = require( './util' );


/**
 * Initializes visibility object factory
 *
 * The visibility object is the "magic" behind ease.js. This factory creates the
 * object that holds the varying levels of visibility, which are swapped out and
 * inherited depending on circumstance.
 *
 * @constructor
 */
module.exports = exports = function VisibilityObjectFactory()
{
    // permit omitting 'new' keyword
    if ( !( this instanceof exports ) )
    {
        // module.exports instead of exports because Closure Compiler seems to
        // be confused
        return new module.exports();
    }
};


/**
 * Sets up properties
 *
 * This includes all members (including private). Private members will be set up
 * in a separate object, so that they can be easily removed from the mix. That
 * object will include the destination object in the prototype, so that the
 * access should be transparent. This object is returned.
 *
 * Properties are expected in the following format. Note that keywords are
 * ignored:
 *     { public: { prop: [ value, { keyword: true } ] } }
 *
 * @param  {Object}   dest        destination object
 * @param  {Object}   properties  properties to copy
 * @param  {Object=}  methods     methods to copy
 *
 * @return  {Object}  object containing private members and dest as prototype
 */
exports.prototype.setup = function setup( dest, properties, methods )
{
    // create the private layer atop of the destination object
    var obj = this._createPrivateLayer( dest, properties );

    // initialize each of the properties for this instance to
    // ensure we're not sharing references to prototype values
    this._doSetup( dest, properties[ 'public' ] );

    // Do the same for protected, but only if they do not exist already in
    // public. The reason for this is because the property object is laid /atop/
    // of the public members, meaning that a parent's protected members will
    // take precedence over a subtype's overriding /public/ members. Uh oh.
    this._doSetup( dest,
        properties[ 'protected' ],
        methods[ 'protected' ],
        true
    );

    // then add the private parts
    this._doSetup( obj, properties[ 'private' ], methods[ 'private' ] );

    return obj;
};


/**
 * Add an extra layer atop the destination object, which will contain the
 * private members
 *
 * The object provided will be used as the prototype for the new private layer,
 * so the provided object will be accessible on the prototype chain.
 *
 * Subtypes may override this method to alter the functionality of the private
 * visibility object (e.g. to prevent it from being created).
 *
 * @param  {Object}  atop_of     object to add private layer atop of
 * @param  {Object}  properties  properties
 *
 * @return  {Object}  private layer with given object as prototype
 */
exports.prototype._createPrivateLayer = function( atop_of, properties )
{
    /** @constructor */
    var obj_ctor = function() {};
    obj_ctor.prototype = atop_of;

    // we'll be returning an instance, so that the prototype takes effect
    var obj = new obj_ctor();

    // All protected properties need to be proxied from the private object
    // (which will be passed as the context) to the object containing protected
    // values. Otherwise, the protected property values would be set on the
    // private object, making them inaccessible to subtypes.
    this.createPropProxy( atop_of, obj, properties[ 'protected' ] );

    return obj;
};


/**
 * Set up destination object by copying over properties and methods
 *
 * The prot_priv parameter can be used to ignore both explicitly and
 * implicitly public methods.
 *
 * @param  {Object}   dest        destination object
 * @param  {Object}   properties  properties to copy
 * @param  {Object}   methods     methods to copy
 * @param  {boolean}  prot_priv   do not set unless protected or private
 *
 * @return  {undefined}
 */
exports.prototype._doSetup = function(
    dest, properties, methods, prot_priv
)
{
    var hasOwn = Array.prototype.hasOwnProperty;

    // copy over the methods
    if ( methods !== undefined )
    {
        for ( var method_name in methods )
        {
            if ( hasOwn.call( methods, method_name ) )
            {
                var pre = dest[ method_name ],
                    kw  = pre && pre.___$$keywords$$;

                // If requested, do not copy the method over if it already
                // exists in the destination object. Don't use hasOwn here;
                // unnecessary overhead and we want to traverse any prototype
                // chains. We do not check the public object directly, for
                // example, because we need a solution that will work if a proxy
                // is unsupported by the engine.
                //
                // Also note that we need to allow overriding if it exists in
                // the protected object (we can override protected with
                // protected). This is the *last* check to ensure a performance
                // hit is incured *only* if we're overriding protected with
                // protected.
                if ( !prot_priv
                    || ( pre === undefined )
                    || ( kw[ 'private' ] || kw[ 'protected' ] )
                )
                {
                    dest[ method_name ] = methods[ method_name ];
                }
            }
        }
    }

    // initialize private/protected properties and store in instance data
    for ( var prop in properties )
    {
        if ( hasOwn.call( properties, prop ) )
        {
            dest[ prop ] = util.clone( properties[ prop ][ 0 ] );
        }
    }
}


/**
 * Creates a proxy for all given properties to the given base
 *
 * The proxy uses getters/setters to forward all calls to the base. The
 * destination object will be used as the proxy. All properties within props
 * will be used proxied.
 *
 * To summarize: for each property in props, all gets and sets will be forwarded
 * to base.
 *
 * Please note that this does not use the JS proxy implementation. That will be
 * done in the future for engines that support it.
 *
 * @param  {Object}  base   object to proxy to
 * @param  {Object}  dest   object to treat as proxy (set getters/setters on)
 * @param  {Object}  props  properties to proxy
 *
 * @return  {Object}  returns dest
 */
exports.prototype.createPropProxy = function( base, dest, props )
{
    var hasOwn = Object.prototype.hasOwnProperty;

    for ( var prop in props )
    {
        if ( !( hasOwn.call( props, prop ) ) )
        {
            continue;
        }

        ( function( prop )
        {
            // just in case it's already defined, so we don't throw an error
            dest[ prop ] = undefined;

            // public properties, when set internally, must forward to the
            // actual variable
            Object.defineProperty( dest, prop, {
                set: function( val )
                {
                    base[ prop ] = val;
                },

                get: function()
                {
                    return base[ prop ];
                },

                enumerable: true,
            } );
        } ).call( null, prop );
    }

    return dest;
};


},{"./util":16}],10:[function(require,module,exports){
/**
 * Contains factory for visibility object factory
 *
 *  Copyright (C) 2011, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * XXX: Figure out how to resolve Closure Compiler's warning about shared
 * type information
 */

// XXX: Tightly coupled
var util = require( './util' ),

    VisibilityObjectFactory = require( './VisibilityObjectFactory' ),

    FallbackVisibilityObjectFactory =
        require( './FallbackVisibilityObjectFactory' )
;


/**
 * Responsible for instantiating the VisibilityObjectFactory appropriate for the
 * runtime environment
 *
 * This prototype determines what class should be instantiated. If we are within
 * an ECMAScript 5 environment, we can take full advantage of the standard
 * visibility object implementation. Otherwise, we are unable to emulate proxies
 * and must fall back on a less sophisticated implementation that sacrifices
 * visibility support.
 */
exports.fromEnvironment = function()
{
    // if falling back, return fallback, otherwise standard
    return ( util.definePropertyFallback() )
        ? FallbackVisibilityObjectFactory()
        : VisibilityObjectFactory()
    ;
};


},{"./FallbackVisibilityObjectFactory":3,"./VisibilityObjectFactory":9,"./util":16}],11:[function(require,module,exports){
/**
 * Contains basic inheritance mechanism
 *
 *  Copyright (C) 2010, 2011, 2012, 2013, 2014, 2015 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Console to use for logging
 *
 * This reference allows an alternative console to be used. Must contain
 * warn() or log() methods.
 *
 * TODO: This needs to be moved into a facade, once more refactoring can be
 * done; it was moved out of warn during its refactoring.
 *
 * @type {Object}
 */
var _console = ( typeof console !== 'undefined' ) ? console : undefined;

var util         = require( './util' ),
    ClassBuilder = require( './ClassBuilder' ),
    Interface    = require( './interface' ),

    warn        = require( './warn' ),
    Warning     = warn.Warning,
    log_handler = warn.LogHandler( _console ),

    MethodWrapperFactory = require( './MethodWrapperFactory' ),
    wrappers             = require( './MethodWrappers' ).standard,

    class_builder = ClassBuilder(
        log_handler,
        require( './MemberBuilder' )(
            MethodWrapperFactory( wrappers.wrapNew ),
            MethodWrapperFactory( wrappers.wrapOverride ),
            MethodWrapperFactory( wrappers.wrapProxy ),
            require( './MemberBuilderValidator' )(
                function( warning )
                {
                    log_handler.handle( Warning( warning ) );
                }
            )
        ),
        require( './VisibilityObjectFactoryFactory' )
            .fromEnvironment()
    )
;

var _nullf = function() { return null; }


/**
 * This module may be invoked in order to provide a more natural looking class
 * definition mechanism
 *
 * This may not be used to extend existing classes. To extend an existing class,
 * use the class's extend() method. If unavailable (or extending a non-ease.js
 * class/object), use the module's extend() method.
 *
 * @param  {string|Object}  namedef  optional name or definition
 * @param  {Object=}        def      class definition if first argument is name
 *
 * @return  {Function|Object}  new class or staging object
 */
module.exports = function( namedef, def )
{
    var type   = ( typeof namedef ),
        result = null,
        args   = [],
        i      = arguments.length
    ;

    // passing arguments object prohibits optimizations in v8
    while ( i-- ) args[ i ] = arguments[ i ];

    switch ( type )
    {
        // anonymous class
        case 'object':
            result = createAnonymousClass.apply( null, args );
            break;

        // named class
        case 'string':
            result = createNamedClass.apply( null, args );
            break;

        default:
            // we don't know what to do!
            throw TypeError(
                "Expecting anonymous class definition or named class definition"
            );
    }

    return result;
};


/**
 * Creates a class, inheriting either from the provided base class or the
 * default base class
 *
 * @param  {Function|Object}  baseordfn   parent or definition object
 * @param  {Object=}          dfn         definition object if parent provided
 *
 * @return  {Function}  extended class
 */
module.exports.extend = extend;


/**
 * Implements an interface or set of interfaces
 *
 * @param  {...Function}  interfaces  interfaces to implement
 *
 * @return  {Object}  intermediate interface object
 */
module.exports.implement = function( interfaces )
{
    // implement on empty base
    return createImplement(
        null,
        Array.prototype.slice.call( arguments )
    );
};


/**
 * Mix a trait into a class
 *
 * The ultimate intent of this depends on the ultimate `extend' call---if it
 * extends another class, then the traits will be mixed into that class;
 * otherwise, the traits will be mixed into the base class. In either case,
 * a final `extend' call is necessary to complete the definition. An attempt
 * to instantiate the return value before invoking `extend' will result in
 * an exception.
 *
 * @param  {Array.<Function>}  traits  traits to mix in
 *
 * @return  {Function}  staging object for class definition
 */
module.exports.use = function( traits )
{
    var args = [], i = arguments.length;
    while( i-- ) args[ i ] = arguments[ i ];

    // consume traits onto an empty base
    return createUse( _nullf, args );
};


var _dummyclass = { prototype: {} };
var _dummyinst  = { constructor: { prototype: {} } };

/**
 * Determines whether the provided object is a class created through ease.js
 *
 * TODO: delegate to ClassBuilder
 *
 * @param  {Object}  obj  object to test
 *
 * @return  {boolean}  true if class (created through ease.js), otherwise false
 */
module.exports.isClass = function( obj )
{
    obj = obj || _dummyclass;

    var meta = ClassBuilder.getMeta( obj );

    // TODO: we're checking a random field on the meta object; do something
    // proper
    return ( ( ( meta !== null ) && meta.implemented )
        || ( obj.prototype instanceof ClassBuilder.ClassBase ) )
        ? true
        : false
    ;
};


/**
 * Determines whether the provided object is an instance of a class created
 * through ease.js
 *
 * TODO: delegate to ClassBuilder
 *
 * @param  {Object}  obj  object to test
 *
 * @return  {boolean}  true if instance of class (created through ease.js),
 *                     otherwise false
 */
module.exports.isClassInstance = function( obj )
{
    obj = obj || _dummyinst;

    // if the constructor is a class, then we must be an instance!
    return module.exports.isClass( obj.constructor );
};


/**
 * Determines if the class is an instance of the given type
 *
 * The given type can be a class, interface, trait or any other type of object.
 * It may be used in place of the 'instanceof' operator and contains additional
 * enhancements that the operator is unable to provide due to prototypal
 * restrictions.
 *
 * @param  {Object}  type      expected type
 * @param  {Object}  instance  instance to check
 *
 * @return  {boolean}  true if instance is an instance of type, otherwise false
 */
module.exports.isInstanceOf = ClassBuilder.isInstanceOf;


/**
 * Alias for isInstanceOf()
 *
 * May read better in certain situations (e.g. Cat.isA( Mammal )) and more
 * accurately conveys the act of inheritance, implementing interfaces and
 * traits, etc.
 */
module.exports.isA = module.exports.isInstanceOf;


/**
 * Creates a new anonymous Class from the given class definition
 *
 * @param  {Object}  def  class definition
 *
 * @return  {Function}  new anonymous class
 */
function createAnonymousClass( def )
{
    // ensure we have the proper number of arguments (if they passed in
    // too many, it may signify that they don't know what they're doing,
    // and likely they're not getting the result they're looking for)
    if ( arguments.length > 1 )
    {
        throw Error(
            "Expecting one argument for anonymous Class definition; " +
                arguments.length + " given."
        );
    }

    return extend( def );
}


/**
 * Creates a new named Class from the given class definition
 *
 * @param  {string}  name  class name
 * @param  {Object}  def   class definition
 *
 * @return  {Function|Object}  new named class or staging object if definition
 *                             was not provided
 */
function createNamedClass( name, def )
{
    // if too many arguments were provided, it's likely that they're
    // expecting some result that they're not going to get
    if ( arguments.length > 2 )
    {
        throw Error(
            "Expecting at most two arguments for definition of named Class '" +
                name + "'; " + arguments.length + " given."
        );
    }

    // if no definition was given, return a staging object, to apply the name to
    // the class once it is actually created
    if ( def === undefined )
    {
        return createStaging( name );
    }
    // the definition must be an object
    else if ( typeof def !== 'object' )
    {
        throw TypeError(
            "Unexpected value for definition of named Class '" + name +
                "'; object expected"
        );
    }

    // add the name to the definition
    def.__name = name;

    return extend( def );
}


/**
 * Creates a staging object to stage a class name
 *
 * The class name will be applied to the class generated by operations performed
 * on the staging object. This allows applying names to classes that need to be
 * extended or need to implement interfaces.
 *
 * @param  {string}  cname  desired class name
 *
 * @return  {Object}  object staging the given class name
 */
function createStaging( cname )
{
    return {
        extend: function()
        {
            var args = [],
                i    = arguments.length;

            while ( i-- ) args[ i ] = arguments[ i ];

            // extend() takes a maximum of two arguments. If only one
            // argument is provided, then it is to be the class definition.
            // Otherwise, the first argument is the supertype and the second
            // argument is the class definition. Either way you look at it,
            // the class definition is always the final argument.
            //
            // We want to add the name to the definition.
            args[ args.length - 1 ].__name = cname;

            return extend.apply( null, args );
        },

        implement: function()
        {
            var args = [],
                i    = arguments.length;

            while ( i-- ) args[ i ] = arguments[ i ];

            // implement on empty base, providing the class name to be used once
            // extended
            return createImplement( null, args, cname );
        },

        use: function()
        {
            var args = [],
                i    = arguments.length;

            while ( i-- ) args[ i ] = arguments[ i ];

            return createUse( _nullf, args );
        },
    };
}


/**
 * Creates an intermediate object to permit implementing interfaces
 *
 * This object defers processing until extend() is called. This intermediate
 * object ensures that a usable class is not generated until after extend() is
 * called, as it does not make sense to create a class without any
 * body/definition.
 *
 * @param  {Object}   base    base class to implement atop of, or null
 * @param  {Array}    ifaces  interfaces to implement
 * @param  {string=}  cname   optional class name once extended
 *
 * @return  {Object}  intermediate implementation object
 */
function createImplement( base, ifaces, cname )
{
    // Defer processing until after extend(). This also ensures that implement()
    // returns nothing usable.
    var partial = {
        extend: function()
        {
            var an       = arguments.length,
                def      = arguments[ an - 1 ],
                ext_base = ( an > 1 ) ? arguments[ an - 2 ] : null
            ;

            // if any arguments remain, then they likely misunderstood what this
            // method does
            if ( an > 2 )
            {
                throw Error(
                    "Expecting no more than two arguments for extend()"
                );
            }

            // if a base was already provided for extending, don't allow them to
            // give us yet another one (doesn't make sense)
            if ( base && ext_base )
            {
                throw Error(
                    "Cannot override parent " + base.toString() + " with " +
                    ext_base.toString() + " via extend()"
                );
            }

            // if a name was provided, use it
            if ( cname )
            {
                def.__name = cname;
            }

            // If a base was provided when createImplement() was called, use
            // that. Otherwise, use the extend() base passed to this function.
            // If neither of those are available, extend from an empty class.
            ifaces.push( base || ext_base || extend( {} ) );

            return extend.call( null,
                implement.apply( this, ifaces ),
                def
            );
        },

        // TODO: this is a naive implementation that works, but could be
        // much more performant (it creates a subtype before mixing in)
        use: function()
        {
            var traits = [],
                i      = arguments.length;

            // passing arguments object prohibits optimizations in v8
            while ( i-- ) traits[ i ] = arguments[ i ];

            return createUse(
                function() { return partial.__createBase(); },
                traits
            );
        },

        // allows overriding default behavior
        __createBase: function()
        {
            return partial.extend( {} );
        },
    };

    return partial;
}


/**
 * Create a staging object representing an eventual mixin
 *
 * This staging objects prepares a class definition for trait mixin. In
 * particular, the returned staging object has the following features:
 *   - invoking it will, if mixing into an existing (non-base) class without
 *     subclassing, immediately complete the mixin and instantiate the
 *     generated class;
 *   - calling `use' has the effect of chaining mixins, stacking them atop
 *     of one-another; and
 *   - invoking `extend' will immediately complete the mixin, resulting in a
 *     subtype of the base.
 *
 * Mixins are performed lazily---the actual mixin will not take place until
 * the final `extend' call, which may be implicit by invoking the staging
 * object (performing instantiation).
 *
 * The third argument determines whether or not a final `extend' call must
 * be explicit: in this case, any instantiation attempts will result in an
 * exception being thrown.
 *
 * This staging object may be used as a base for extending.  Note, however,
 * that its metadata are unavailable at the time of definition---its
 * contents are marked as "lazy" and must be processed using the mixin's
 * eventual metadata.
 *
 * @param  {function()}        basef    returns base from which to lazily
 *                                       extend
 * @param  {Array.<Function>}  traits   traits to mix in
 * @param  {boolean}           nonbase  extending from a non-base class
 *                                       (setting will permit instantiation
 *                                       with implicit extend)
 *
 * @return  {Function}  staging object for mixin
 *
 * @throws  {TypeError}  when object is not a trait
 */
function createUse( basef, traits, nonbase )
{
    _validateTraits( traits );

    // invoking the partially applied class will immediately complete its
    // definition and instantiate it with the provided constructor arguments
    var partial = function()
    {
        return partialClass()
            .apply( null, arguments );
    };


    var partialClass = function()
    {
        // this argument will be set only in the case where an existing
        // (non-base) class is extended, meaning that an explict Class or
        // AbstractClass was not provided
        if ( !( nonbase ) )
        {
            throw TypeError(
                "Cannot instantiate incomplete class definition; did " +
                "you forget to call `extend'?"
            );
        }

        return createMixedClass( basef(), traits );
    };


    // otherwise, its definition is deferred until additional context is
    // given during the extend operation
    partial.extend = function()
    {
        var an       = arguments.length,
            dfn      = arguments[ an - 1 ],
            ext_base = ( an > 1 ) ? arguments[ an - 2 ] : null,
            base     = basef();

        // extend the mixed class, which ensures that all super references
        // are properly resolved
        return extend.call( null,
            createMixedClass( ( base || ext_base ), traits ),
            dfn
        );
    };

    // syntatic sugar to avoid the aruduous and seemingly pointless `extend'
    // call simply to mix in another trait
    partial.use = function()
    {
        var args = [],
            i    = arguments.length;

        while ( i-- ) args[ i ] = arguments[ i ];

        return createUse(
            function()
            {
                return partial.__createBase();
            },
            args,
            nonbase
        );
    };

    // allows overriding default behavior
    partial.__createBase = function()
    {
        return partial.extend( {} );
    };

    partial.asPrototype = function()
    {
        return partialClass().asPrototype();
    };

    partial.__isInstanceOf = Interface.isInstanceOf;

    // allow the system to recognize this object as a viable base for
    // extending, but mark the metadata as lazy: since we defer all
    // processing for mixins, we cannot yet know all metadata
    // TODO: `_lazy' is a kluge
    ClassBuilder.masquerade( partial );
    ClassBuilder.getMeta( partial )._lazy = true;

    return partial;
}


/**
 * Verify that each object in TRAITS will be able to be mixed in
 *
 * TODO: Use Trait.isTrait; we have circular dependency issues at the moment
 * preventing that; refactoring is needed.
 *
 * @param  {Array}  traits  objects to validate
 *
 * @return  {undefined}
 *
 * @throws  {TypeError}  when object is not a trait
 */
function _validateTraits( traits )
{
    for ( var t in traits )
    {
        if ( typeof traits[ t ].__mixin !== 'function' )
        {
            throw TypeError( "Cannot mix in non-trait " + t );
        }
    }
}


function createMixedClass( base, traits )
{
    // generated definition for our [abstract] class that will mix in each
    // of the provided traits; it will automatically be marked as abstract
    // if needed
    var dfn = { ___$$auto$abstract$$: true };

    // this object is used as a class-specific context for storing trait
    // data; it will be encapsulated within a ctor closure and will not be
    // attached to any class
    var tc = [];

    // "mix" each trait into the class definition object
    for ( var i = 0, n = traits.length; i < n; i++ )
    {
        traits[ i ].__mixin( dfn, tc, ( base || ClassBuilder.ClassBase ) );
    }

    // create the mixed class from the above generated definition
    var C    = extend.call( null, base, dfn ),
        meta = ClassBuilder.getMeta( C );

    // add each trait to the list of implemented types so that the
    // class is considered to be of type T in traits
    var impl = meta.implemented;
    for ( var i = 0, n = traits.length; i < n; i++ )
    {
        impl.push( traits[ i ] );
        traits[ i ].__mixinImpl( impl );
    }

    return C;
}


/**
 * Mimics class inheritance
 *
 * This method will mimic inheritance by setting up the prototype with the
 * provided base class (or, by default, Class) and copying the additional
 * properties atop of it.
 *
 * The class to inherit from (the first argument) is optional. If omitted, the
 * first argument will be considered to be the properties list.
 *
 * @param  {Function|Object}  _   parent or definition object
 * @param  {Object=}          __  definition object if parent was provided
 *
 * @return  {Function}  extended class
 */
function extend( _, __ )
{
    var args = [],
        i    = arguments.length;

    // passing arguments object prohibits optimizations in v8
    while ( i-- ) args[ i ] = arguments[ i ];

    // set up the new class
    var new_class = class_builder.build.apply( class_builder, args );

    // set up some additional convenience props
    setupProps( new_class );

    // lock down the new class (if supported) to ensure that we can't add
    // members at runtime
    util.freeze( new_class );

    return new_class;
}


/**
 * Implements interface(s) into an object
 *
 * This will copy all of the abstract methods from the interface and merge it
 * into the given object.
 *
 * @param  {Object}       baseobj     base object
 * @param  {...Function}  interfaces  interfaces to implement into dest
 *
 * @return  {Object}  destination object with interfaces implemented
 */
var implement = function( baseobj, interfaces )
{
    var an   = arguments.length,
        dest = {},
        base = arguments[ an - 1 ],
        arg  = null,

        implemented   = [],
        make_abstract = false
    ;

    // add each of the interfaces
    for ( var i = 0; i < ( an - 1 ); i++ )
    {
        arg = arguments[ i ];

        // copy all interface methods to the class (does not yet deep copy)
        util.propParse( arg.prototype, {
            method: function( name, func, is_abstract, keywords )
            {
                dest[ 'abstract ' + name ] = func.definition;
                make_abstract = true;
            },
        } );
        implemented.push( arg );
    }

    // xxx: temporary
    if ( make_abstract )
    {
        dest.___$$abstract$$ = true;
    }

    // create a new class with the implemented abstract methods
    var class_new = module.exports.extend( base, dest );
    ClassBuilder.getMeta( class_new ).implemented = implemented;

    return class_new;
}


/**
 * Sets up common properties for the provided function (class)
 *
 * @param  {function()}  func  function (class) to set up
 *
 * @return  {undefined}
 */
function setupProps( func )
{
    attachExtend( func );
    attachImplement( func );
    attachUse( func );
}


/**
 * Attaches extend method to the given function (class)
 *
 * This is a shorthand method that can be invoked on the object, rather than
 * having to call Class.extend( this ).
 *
 * @param  {Function}  func  function (class) to attach method to
 *
 * @return  {undefined}
 */
function attachExtend( func )
{
    util.defineSecureProp( func, 'extend', function( props )
    {
        return extend( this, props );
    });
}


/**
 * Attaches implement method to the given function (class)
 *
 * Please see the implement() export of this module for more information.
 *
 * @param  {function()}  func  function (class) to attach method to
 *
 * @return  {undefined}
 */
function attachImplement( func )
{
    util.defineSecureProp( func, 'implement', function()
    {
        var args = [], i = arguments.length;
        while( i-- ) args[ i ] = arguments[ i ];

        return createImplement( func, args );
    });
}


/**
 * Attaches use method to the given function (class)
 *
 * Please see the `use' export of this module for more information.
 *
 * @param  {function()}  func  function (class) to attach method to
 *
 * @return  {undefined}
 */
function attachUse( func )
{
    util.defineSecureProp( func, 'use', function()
    {
        var args = [], i = arguments.length;
        while( i-- ) args[ i ] = arguments[ i ];

        return createUse( function() { return func; }, args, true );
    } );
}


},{"./ClassBuilder":2,"./MemberBuilder":4,"./MemberBuilderValidator":5,"./MethodWrapperFactory":6,"./MethodWrappers":7,"./VisibilityObjectFactoryFactory":10,"./interface":14,"./util":16,"./warn":21}],12:[function(require,module,exports){
/**
 * Wrapper permitting the definition of abstract classes
 *
 * This doesn't actually introduce any new functionality. Rather, it sets a
 * flag to allow abstract methods within a class, forcing users to clearly
 * state that a class is abstract.
 *
 *  Copyright (C) 2010, 2011, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var Class = require( './class' );


/**
 * Creates an abstract class
 *
 * @return  {Function}  abstract class
 */
module.exports = exports = function()
{
    markAbstract( arguments[ arguments.length - 1 ] );

    // forward everything to Class
    var result = Class.apply( this, arguments );

    // if we're using the temporary object, then override its methods to permit
    // abstract classes
    if ( !Class.isClass( result ) )
    {
        abstractOverride( result );
    }

    return result;
};


/**
 * Creates an abstract class from a class extend operation
 *
 * @return  {Function}  abstract class
 */
exports.extend = function()
{
    markAbstract( arguments[ arguments.length - 1 ] );
    return Class.extend.apply( this, arguments );
};


/**
 * Mixes in a trait
 *
 * @return  {Object}  staged abstract class
 */
exports.use = function()
{
    return abstractOverride(
        Class.use.apply( this, arguments )
    );
};


/**
 * Creates an abstract class implementing the given members
 *
 * Simply wraps the class module's implement() method.
 *
 * @return  {Object}  staged abstract class
 */
exports.implement = function()
{
    return abstractOverride(
        Class.implement.apply( this, arguments )
    );
};


/**
 * Causes a definition to be flagged as abstract
 *
 * @param  {*}  dfn  suspected definition object
 *
 * @return  {undefined}
 */
function markAbstract( dfn )
{
    if ( typeof dfn === 'object' )
    {
        // mark as abstract
        dfn.___$$abstract$$ = true;
    }
}


/**
 * Overrides object members to permit abstract classes
 *
 * @param  {Object}  obj  object to override
 *
 * @return  {Object}  obj
 */
function abstractOverride( obj )
{
    var extend = obj.extend,
        impl   = obj.implement,
        use    = obj.use;

    // wrap and apply the abstract flag, only if the method is defined (it
    // may not be under all circumstances, e.g. after an implement())
    impl && ( obj.implement = function()
    {
        return abstractOverride( impl.apply( this, arguments ) );
    } );

    var mixin = false;
    use && ( obj.use = function()
    {
        return abstractOverride( use.apply( this, arguments ) );
    } );

    // wrap extend, applying the abstract flag
    obj.extend = function()
    {
        markAbstract( arguments[ arguments.length - 1 ] );
        return extend.apply( this, arguments );
    };

    // used by mixins; we need to mark the intermediate subtype as abstract,
    // but ensure we don't throw any errors if no abstract members are mixed
    // in (since thay may be mixed in later on)
    obj.__createBase = function()
    {
        return extend( { ___$$auto$abstract$$: true } );
    };

    return obj;
}


},{"./class":11}],13:[function(require,module,exports){
/**
 * Wrapper permitting the definition of final classes
 *
 *  Copyright (C) 2010, 2011, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var Class = require( './class' );


/**
 * Creates a final class
 *
 * @return  {Function}  final class
 */
exports = module.exports = function()
{
    markFinal( arguments[ arguments.length - 1 ] );

    // forward everything to Class
    var result = Class.apply( this, arguments );

    if ( !Class.isClass( result ) )
    {
        finalOverride( result );
    }

    return result;
};


/**
 * Creates a final class from a class extend operation
 *
 * @return  {Function}  final class
 */
exports.extend = function()
{
    markFinal( arguments[ arguments.length - 1 ] );
    return Class.extend.apply( this, arguments );
};


/**
 * Causes a definition to be flagged as final
 *
 * @param  {!Arguments}  dfn  suspected definition object
 *
 * @return  {undefined}
 */
function markFinal( dfn )
{
    if ( typeof dfn === 'object' )
    {
        // mark as abstract
        dfn.___$$final$$ = true;
    }
}


/**
 * Overrides object members to permit final classes
 *
 * @param  {Object}  obj  object to override
 *
 * @return  {undefined}
 */
function finalOverride( obj )
{
    var extend = obj.extend;

    // wrap extend, applying the abstract flag
    obj.extend = function()
    {
        markFinal( arguments[ arguments.length - 1 ] );
        return extend.apply( this, arguments );
    };
}


},{"./class":11}],14:[function(require,module,exports){
/**
 * Contains interface module
 *
 *  Copyright (C) 2010, 2011, 2012, 2013, 2014, 2015 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var util           = require( './util' ),

    MethodWrapperFactory = require( './MethodWrapperFactory' ),
    wrappers             = require( './MethodWrappers' ).standard,

    member_builder = require( './MemberBuilder' )(
        MethodWrapperFactory( wrappers.wrapNew ),
        MethodWrapperFactory( wrappers.wrapOverride ),
        MethodWrapperFactory( wrappers.wrapProxy ),
        require( './MemberBuilderValidator' )()
    ),

    ClassBuilder = require( './ClassBuilder' );


/**
 * This module may be invoked in order to provide a more natural looking
 * interface definition
 *
 * Only new interfaces may be created using this method. They cannot be
 * extended. To extend an existing interface, call its extend() method, or use
 * the extend() method of this module.
 *
 * @param  {string|Object}  namedef  optional name or definition
 * @param  {Object=}        def      interface definition if first arg is name
 *
 * @return  {Function|Object}  new interface or staging object
 */
module.exports = function( namedef, def )
{
    var type   = ( typeof namedef ),
        result = null
    ;

    switch ( type )
    {
        // anonymous interface
        case 'object':
            result = createAnonymousInterface.apply( null, arguments );
            break;

        // named class
        case 'string':
            result = createNamedInterface.apply( null, arguments );
            break;

        default:
            // we don't know what to do!
            throw TypeError(
                "Expecting anonymous interface definition or named " +
                    "interface definition"
            );
    }

    return result;
};


/**
 * Creates an interface
 *
 * @return  {Function}  extended interface
 */
module.exports.extend = function()
{
    return extend.apply( this, arguments );
};


/**
 * Determines whether the provided object is an interface created through
 * ease.js
 *
 * @param  {Object}  obj  object to test
 *
 * @return  {boolean}  true if interface (created through ease.js), otherwise
 *                     false
 */
module.exports.isInterface = function( obj )
{
    obj = obj || {};

    return ( obj.prototype instanceof Interface )
        ? true
        : false
    ;
};


/**
 * Default interface implementation
 *
 * @return  {undefined}
 */
function Interface() {}


/**
 * Creates a new anonymous Interface from the given interface definition
 *
 * @param  {Object}  def  interface definition
 *
 * @return  {Function}  new anonymous interface
 */
function createAnonymousInterface( def )
{
    // ensure we have the proper number of arguments (if they passed in
    // too many, it may signify that they don't know what they're doing,
    // and likely they're not getting the result they're looking for)
    if ( arguments.length > 1 )
    {
        throw Error(
            "Expecting one argument for Interface definition; " +
                arguments.length + " given."
        );
    }

    return extend( def );
}


/**
 * Creates a new named interface from the given interface definition
 *
 * @param  {string}  name  interface name
 * @param  {Object}  def   interface definition
 *
 * @return  {Function}  new named interface
 */
function createNamedInterface( name, def )
{
    // if too many arguments were provided, it's likely that they're
    // expecting some result that they're not going to get
    if ( arguments.length > 2 )
    {
        throw Error(
            "Expecting two arguments for definition of named Interface '" +
                name + "'; " + arguments.length + " given."
        );
    }

    // the definition must be an object
    if ( typeof def !== 'object' )
    {
        throw TypeError(
            "Unexpected value for definition of named Interface '" +
                name + "'; object expected"
        );
    }

    // add the name to the definition
    def.__name = name;

    return extend( def );
}


/**
 * Augment an exception with interface name and then throw
 *
 * @param  {string}  iname  interface name or empty string
 * @param  {Error}   e      exception to augment
 */
function _ithrow( iname, e )
{
    // alter the message to include our name
    e.message = "Failed to define interface " +
        ( ( iname ) ? iname : '(anonymous)' ) + ": " + e.message
    ;

    throw e;
}


var extend = ( function( extending )
{
    return function extend()
    {
        // ensure we'll be permitted to instantiate interfaces for the base
        extending = true;

        var a         = arguments,
            an        = a.length,
            props     = ( ( an > 0 ) ? a[ an - 1 ] : 0 ) || {},
            base      = ( ( an > 1 ) ? a[ an - 2 ] : 0 ) || Interface,
            prototype = new base(),
            iname     = '',

            // holds validation state
            vstate = {},

            members = member_builder.initMembers(
                prototype, prototype, prototype
            )
        ;

        // grab the name, if one was provided
        if ( iname = props.__name )
        {
            // we no longer need it
            delete props.__name;
        }

        // sanity check
        inheritCheck( prototype );

        var new_interface = createInterface( iname );

        util.propParse( props, {
            assumeAbstract: true,

            // override default exceptions from parser errors
            _throw: function( e )
            {
                _ithrow( iname, e );
            },

            property: function()
            {
                // should never get to this point because of assumeAbstract
                _ithrow( iname, TypeError( "Unexpected internal error" ) );
            },

            getset: function()
            {
                // should never get to this point because of assumeAbstract
                _ithrow( iname, TypeError( "Unexpected internal error" ) );
            },

            method: function( name, value, is_abstract, keywords )
            {
                // all members must be public
                if ( keywords[ 'protected' ] || keywords[ 'private' ] )
                {
                    _ithrow( iname, TypeError(
                        "Member " + name + " must be public"
                    ) );
                }

                member_builder.buildMethod(
                    members, null, name, value, keywords,
                    null, 0, {}, vstate
                );
            },
        } );

        attachExtend( new_interface );
        attachStringMethod( new_interface, iname );
        attachCompat( new_interface );
        attachInstanceOf( new_interface );

        new_interface.prototype   = prototype;
        new_interface.constructor = new_interface;

        // freeze the interface (preventing additions), if supported
        util.freeze( new_interface );

        // we're done; let's not allow interfaces to be instantiated anymore
        extending = false;

        return new_interface;
    };


    /**
     * Creates a new interface constructor function
     *
     * @param  {string=}  iname  interface name
     *
     * @return  {function()}
     */
    function createInterface( iname )
    {
        return function()
        {
            // allows us to extend the interface without throwing an exception
            // (since the prototype requires an instance)
            if ( !extending )
            {
                // only called if someone tries to create a new instance of an
                // interface
                throw Error(
                    "Interface " + ( ( iname ) ? ( iname + ' ' ) : '' ) +
                        " cannot be instantiated"
                );
            }
        };
    }
} )( false );


/**
 * Assures that the parent object is a valid object to inherit from
 *
 * This method allows inheriting from any object (note that it will likely cause
 * errors if not an interface), but will place restrictions on objects like
 * Classes that do not make sense to inherit from. This will provide a more
 * friendly error, with suggestions on how to resolve the issue, rather than a
 * cryptic error resulting from inheritance problems.
 *
 * This method will throw an exception if there is a violation.
 *
 * @param  {Object}  prototype  prototype to check for inheritance flaws
 *
 * @return  {undefined}
 */
function inheritCheck( prototype )
{
    // if we're inheriting from another interface, then we're good
    if ( !( prototype instanceof Interface ) )
    {
        throw new TypeError( "Interfaces may only extend other interfaces" );
    }
}


/**
 * Attaches extend method to the given function (interface)
 *
 * This shorthand method can be invoked on the object, rather than having to
 * call Interface.extend( this ).
 *
 * @param  {Function}  func  function (interface) to attach method to
 *
 * @return  {undefined}
 */
function attachExtend( func )
{
    util.defineSecureProp( func, 'extend', function( props )
    {
        return extend( this, props );
    });
}


/**
 * Provides more sane/useful output when interface is converted to a string
 *
 * @param  {Object}   func   interface
 * @param  {string=}  iname  interface name
 *
 * @return  {undefined}
 */
function attachStringMethod( func, iname )
{
    func.toString = ( iname )
        ? function() { return '[object Interface <' + iname + '>]'; }
        : function() { return '[object Interface]'; }
    ;
}


/**
 * Attaches a method to assert whether a given object is compatible with the
 * interface
 *
 * @param  {Function}  iface  interface to attach method to
 *
 * @return  {undefined}
 */
function attachCompat( iface )
{
    util.defineSecureProp( iface, 'isCompatible', function( obj )
    {
        return isCompat( iface, obj );
    } );
}


/**
 * Determines if the given object is compatible with the given interface.
 *
 * An object is compatible if it defines all methods required by the
 * interface, with at least the required number of parameters.
 *
 * Processing time is linear with respect to the number of members of the
 * provided interface.
 *
 * To get the actual reasons in the event of a compatibility failure, use
 * analyzeCompat instead.
 *
 * @param  {Interface}  iface  interface that must be adhered to
 * @param  {Object}     obj    object to check compatibility against
 *
 * @return  {boolean}  true if compatible, otherwise false
 */
function isCompat( iface, obj )
{
    // yes, this processes the entire interface, but it is hopefully small
    // anyway and the process is fast enough that doing otherwise may be
    // micro-optimizing
    return analyzeCompat( iface, obj ).length === 0;
}


/**
 * Analyzes the given object to determine if there exists any compatibility
 * issues with respect to the given interface
 *
 * Will provide an array of the names of incompatible members. A method is
 * incompatible if it is not defined or if it does not define at least the
 * required number of parameters.
 *
 * Processing time is linear with respect to the number of members of the
 * provided interface.
 *
 * @param  {Interface}  iface  interface that must be adhered to
 * @param  {Object}     obj    object to check compatibility against
 *
 * @return  {Array.<Array.<string, string>>}  compatibility reasons
 */
function analyzeCompat( iface, obj )
{
    var missing = [];

    util.propParse( iface.prototype, {
        method: function( name, func, is_abstract, keywords )
        {
            if ( typeof obj[ name ] !== 'function' )
            {
                missing.push( [ name, 'missing' ] );
            }
            else if ( obj[ name ].length < func.__length )
            {
                // missing parameter(s); note that we check __length on the
                // interface method (our internal length) but not on the
                // object (since it may be a vanilla object)
                missing.push( [ name, 'incompatible' ] );
            }
        },
    } );

    return missing;
}


/**
 * Attaches instance check method
 *
 * This method is invoked when checking the type of a class against an
 * interface.
 *
 * @param  {Interface}  iface  interface that must be adhered to
 *
 * @return  {undefined}
 */
function attachInstanceOf( iface )
{
    util.defineSecureProp( iface, '__isInstanceOf', function( type, obj )
    {
        return _isInstanceOf( type, obj );
    } );
}


/**
 * Determine if INSTANCE implements the interface TYPE
 *
 * @param  {Interface}  type      interface to check against
 * @param  {Object}     instance  instance to examine
 *
 * @return  {boolean}  whether TYPE is implemented by INSTANCE
 */
function _isInstanceOf( type, instance )
{
    // we are interested in the class's metadata, not the instance's
    var proto = instance.constructor;

    // if no metadata are available, then our remaining checks cannot be
    // performed
    var meta;
    if ( !instance.__cid || !( meta = ClassBuilder.getMeta( proto ) ) )
    {
        return isCompat( type, instance );
    }

    var implemented = meta.implemented,
        i           = implemented.length;

    // check implemented interfaces et. al. (other systems may make use of
    // this meta-attribute to provide references to types)
    while ( i-- )
    {
        if ( implemented[ i ] === type )
        {
            return true;
        }
    }

    return false;
}

module.exports.isInstanceOf = _isInstanceOf;


},{"./ClassBuilder":2,"./MemberBuilder":4,"./MemberBuilderValidator":5,"./MethodWrapperFactory":6,"./MethodWrappers":7,"./util":16}],15:[function(require,module,exports){
/**
 * Property keyword parser module
 *
 *  Copyright (C) 2010, 2011, 2012, 2013, 2014, 2015 Free Software Foundation, Inc.
 *  Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Known (permitted) keywords
 * @type {Object.<string,boolean>}
 */
var _keywords = {
    'public':    1,
    'protected': 1<<1,
    'private':   1<<2,
    'static':    1<<3,
    'abstract':  1<<4,
    'const':     1<<5,
    'virtual':   1<<6,
    'override':  1<<7,
    'proxy':     1<<8,
    'weak':      1<<9,
};

/**
 * Keyword masks for conveniently checking the keyword bitfield
 * @type {Object.<string,integer>}
 */
var _kmasks = {
    amods: _keywords[ 'public' ]
        | _keywords[ 'protected' ]
        | _keywords[ 'private' ],

    'virtual': _keywords[ 'abstract' ]
        | _keywords[ 'virtual' ],
};


// expose magic values
exports.kvals  = _keywords;
exports.kmasks = _kmasks;


/**
 * Parses property keywords
 *
 * @param  {string}  prop  property string, which may contain keywords
 *
 * @return  {{name: string, bitwords: number, keywords: Object.<string, boolean>}}
 */
exports.parseKeywords = function ( prop )
{
    var name        = prop,
        keywords    = [],
        bitwords    = 0x00,
        keyword_obj = {};

    prop = ''+( prop );

    // the keywords are all words, except for the last, which is the
    // property name
    if ( ( keywords = prop.split( /\s+/ ) ).length !== 1 )
    {
        name = keywords.pop();

        var i = keywords.length;
        while ( i-- )
        {
            var keyword = keywords[ i ],
                kval    = _keywords[ keyword ];

            // ensure the keyword is recognized
            if ( !kval )
            {
                throw Error(
                    "Unexpected keyword for '" + name + "': " + keyword
                );
            }

            // ease-of-access
            keyword_obj[ keyword ] = true;

            // permits quick and concise checks
            bitwords |= kval;
        }
    }

    // members with an underscore prefix are implicitly private, unless an
    // access modifier is explicitly provided; double-underscore is ingored,
    // as they denote special members that do not become part of the
    // prototype and are reserved by ease.js
    if ( ( name.match( /^_[^_]/ ) && !( bitwords & _kmasks.amods ) ) )
    {
        keyword_obj[ 'private' ] = true;
        bitwords |= _keywords[ 'private' ];
    }

    return {
        name:     name,
        keywords: keyword_obj,
        bitwords: bitwords,
    };
}

},{}],16:[function(require,module,exports){
/**
 * Contains utilities functions shared by modules
 *
 *  Copyright (C) 2010, 2011, 2012, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var propParseKeywords = require( './prop_parser' ).parseKeywords;


/**
 * Whether we can actually define properties, or we need to fall back
 *
 * This check actually attempts to set a property and fails if there's an error.
 * This is needed because IE8 has a broken implementation, yet still defines
 * Object.defineProperty for use with DOM elements. Just another day in the life
 * of a web developer.
 *
 * This test is only performed once, when the module is first loaded. Don't
 * expect a performance hit from it.
 *
 * @type  {boolean}
 */
var can_define_prop = ( function()
{
    if ( typeof Object.defineProperty === 'function' )
    {
        try
        {
            // perform test, primarily for IE8
            Object.defineProperty( {}, 'x', {} );
            return true;
        }
        catch ( e ) {}
    }

    return false;
} )();


exports.Global = require( './util/Global' );


/**
 * Freezes an object if freezing is supported
 *
 * @param  {Object}  obj  object to freeze
 *
 * @return  {Object}  object passed to function
 */
exports.freeze = ( typeof Object.freeze === 'function' )
    ? Object.freeze
    : function( obj )
    {
        return;
    }
;


/**
 * Gets/sets whether the system needs to fall back to defining properties in a
 * normal manner when use of Object.defineProperty() is requested
 *
 * This will be set by default if the JS engine does not support the
 * Object.defineProperty method from ECMAScript 5.
 *
 * @param  {boolean=}  val  value, if used as setter
 *
 * @return  {boolean|Object}  current value if getter, self if setter
 */
exports.definePropertyFallback = function( val )
{
    if ( val === undefined )
    {
        return !can_define_prop;
    }

    can_define_prop = !val;
    exports.defineSecureProp = getDefineSecureProp();

    return exports;
};


/**
 * Attempts to define a non-enumerable, non-writable and non-configurable
 * property on the given object
 *
 * If the operation is unsupported, a normal property will be set.
 *
 * @param  {Object}  obj    object to set property on
 * @param  {string}  prop   name of property to set
 * @param  {*}       value  value to set
 *
 * @return  {undefined}
 */
exports.defineSecureProp = getDefineSecureProp();


/**
 * Clones an object
 *
 * @param  {*}         data  object to clone
 * @param  {boolean=}  deep  perform deep clone (defaults to shallow)
 *
 * @return  {*}  cloned object
 *
 * Closure Compiler ignores typeof checks and is thusly confused:
 * @suppress {checkTypes}
 */
exports.clone = function clone( data, deep )
{
    deep = !!deep;

    if ( data instanceof Array )
    {
        if ( !deep )
        {
            // return a copy of the array
            return data.slice( 0 );
        }

        // if we're performing a deep clone, we have to loop through each of the
        // elements of the array and clone them
        var ret = [];
        for ( var i = 0, len = data.length; i < len; i++ )
        {
            // clone this element
            ret.push( clone( data[ i ], deep ) );
        }

        return ret;
    }
    else if ( typeof data === 'function' )
    {
        // It is pointless to clone a function. Even if we did clone those that
        // support toSource(), they'd still do the same damn thing.
        return data;
    }
    // explicitly testing with instanceof will ensure we're actually testing an
    // object, not something that may be misinterpreted as one (e.g. null)
    else if ( data instanceof Object )
    {
        var newobj = {},
            hasOwn = Object.prototype.hasOwnProperty;

        // copy data to the new object
        for ( var prop in data )
        {
            if ( hasOwn.call( data, prop ) )
            {
                newobj[ prop ] = ( deep )
                    ? clone( data[ prop ] )
                    : data[ prop ]
                ;
            }
        }

        return newobj;
    }

    // primitive type; cloning unnecessary
    return data;
};


/**
 * Copies properties from one object to another
 *
 * This method is designed to support very basic object extensions. The
 * destination argument is first to allow extending an object without using the
 * full-blown class system.
 *
 * If a deep copy is not performed, all values will be copied by reference.
 *
 * @param  {Object}   dest  destination object
 * @param  {Object}   src   source object
 * @param  {boolean}  deep  perform deep copy (slower)
 *
 * @return  {Object}  dest
 */
exports.copyTo = function( dest, src, deep )
{
    deep = !!deep;

    var get, set, data;

    // sanity check
    if ( !( dest instanceof Object ) || !( src instanceof Object ) )
    {
        throw TypeError(
            "Must provide both source and destination objects"
        );
    }

    // slower; supports getters/setters
    if ( can_define_prop )
    {
        for ( var prop in src )
        {
            data = Object.getOwnPropertyDescriptor( src, prop );

            if ( data.get || data.set )
            {
                // Define the property the slower way (only needed for
                // getters/setters). We don't have to worry about cloning in
                // this case, since getters/setters are methods.
                Object.defineProperty( dest, prop, data );
            }
            else
            {
                // normal copy; cloned if deep, otherwise by reference
                dest[ prop ] = ( deep )
                    ? exports.clone( src[ prop ], true )
                    : src[ prop ]
                ;
            }
        }
    }
    // quick (keep if statement out of the loop)
    else
    {
        for ( var prop in src )
        {
            // normal copy; cloned if deep, otherwise by reference
            dest[ prop ] = ( deep )
                ? exports.clone( src[ prop ], true )
                : src[ prop ]
            ;
        }
    }

    // return dest for convenience (and to feel useful about ourselves)
    return dest;
};


/**
 * Throw an exception
 *
 * Yes, this function has purpose; see where it's used.
 *
 * @param  {Error}  e  exception to throw
 */
function _throw( e )
{
    throw e;
}


/**
 * Parses object properties to determine how they should be interpreted in an
 * Object Oriented manner
 *
 * @param  {!Object}  data     properties with names as the key
 *
 * @param  {!{each,property,method,getset,keywordParser}}  options
 *         parser options and callbacks
 *
 * @return undefined
 */
exports.propParse = function( data, options, context )
{
    // todo: profile; function calls are more expensive than if statements, so
    // it's probably a better idea not to use fvoid
    var fvoid          = function() {},
        callbackEach   = options.each          || undefined,
        callbackProp   = options.property      || fvoid,
        callbackMethod = options.method        || fvoid,
        callbackGetSet = options.getset        || fvoid,
        keywordParser  = options.keywordParser || propParseKeywords,

        throwf = options._throw || _throw,

        hasOwn = Object.prototype.hasOwnProperty,

        parse_data = {},
        name       = '',
        keywords   = {},
        value      = null,
        getter     = false,
        setter     = false;

    // for each of the given properties, determine what type of property we're
    // dealing with (in the classic OO sense)
    for ( var prop in data )
    {
        // ignore properties of instance prototypes
        if ( !( hasOwn.call( data, prop ) ) )
        {
            continue;
        }

        // retrieve getters/setters, if supported
        if ( can_define_prop )
        {
            var prop_desc = Object.getOwnPropertyDescriptor( data, prop );
            getter = prop_desc.get;
            setter = prop_desc.set;
        }

        // do not attempt to retrieve the value if a getter is defined (as that
        // would then call the getter)
        value = ( typeof getter === 'function' )
            ? undefined
            : data[ prop ];

        parse_data = keywordParser( prop ) || {};
        name       = parse_data.name || prop;
        keywords   = parse_data.keywords || {};

        // note the exception for abstract overrides
        if ( options.assumeAbstract
            || ( keywords[ 'abstract' ] && !( keywords[ 'override' ] ) )
        )
        {
            // may not be set if assumeAbstract is given
            keywords[ 'abstract' ] = true;

            if ( !( value instanceof Array ) )
            {
                throwf( TypeError(
                    "Missing parameter list for abstract method: " + name
                ) );
            }

            verifyAbstractNames( throwf, name, value );
            value = exports.createAbstractMethod.apply( this, value );
        }

        // if an 'each' callback was provided, pass the data before parsing it
        if ( callbackEach )
        {
            callbackEach.call( context, name, value, keywords );
        }

        // getter/setter
        if ( getter || setter )
        {
            callbackGetSet.call( context,
                name, getter, setter, keywords
            );
        }
        // method
        else if ( ( typeof value === 'function' ) || ( keywords[ 'proxy' ] ) )
        {
            callbackMethod.call(
                context,
                name,
                value,
                exports.isAbstractMethod( value ),
                keywords
            );
        }
        // simple property
        else
        {
            callbackProp.call( context, name, value, keywords );
        }
    }
};


/**
 * Only permit valid names for parameter list
 *
 * In the future, we may add additional functionality, so it's important to
 * restrict this as much as possible for the time being.
 *
 * @param  {function(Error)}  throwf  function to call with error
 *
 * @param  {string}  name    name of abstract member (for error)
 * @param  {Object}  params  parameter list to check
 *
 * @return {undefined}
 */
function verifyAbstractNames( throwf, name, params )
{
    var i = params.length;
    while ( i-- )
    {
        if ( params[ i ].match( /^[a-z_][a-z0-9_]*$/i ) === null )
        {
            throwf( SyntaxError(
                "Member " + name + " contains invalid parameter '" +
                params[ i ] + "'"
            ) );
        }
    }
}


/**
 * Creates an abstract method
 *
 * Abstract methods must be implemented by a subclass and cannot be called
 * directly. If a class contains a single abstract method, the class itself is
 * considered to be abstract and cannot be instantiated. It may only be
 * extended.
 *
 * @param  {...string}  def  function definition that concrete
 *                           implementations must follow
 *
 * @return  {function()}
 */
exports.createAbstractMethod = function( def )
{
    var dfn = [],
        i   = arguments.length;

    while ( i-- ) dfn[ i ] = arguments[ i ];

    var method = function()
    {
        throw new Error( "Cannot call abstract method" );
    };

    exports.defineSecureProp( method, 'abstractFlag', true );
    exports.defineSecureProp( method, 'definition', dfn );
    exports.defineSecureProp( method, '__length', arguments.length );

    return method;
};


/**
 * Determines if the given function is an abstract method
 *
 * @param  {function()}  func  function to inspect
 *
 * @return  {boolean}  true if function is an abstract method, otherwise false
 *
 * @suppress {checkTypes}
 */
exports.isAbstractMethod = function( func )
{
    return ( ( typeof func === 'function') && ( func.abstractFlag === true ) )
        ? true
        : false
    ;
};


/**
 * Shrinks an array, removing undefined elements
 *
 * Pushes all items onto a new array, removing undefined elements. This ensures
 * that the length of the array represents correctly the number of elements in
 * the array.
 *
 * @param  {Array}  items  array to shrink
 *
 * @return  {Array}  shrunken array
 */
exports.arrayShrink = function( items )
{
    // copy the methods into a new array by pushing them onto it, to ensure
    // the length property of the array will work properly
    var arr_new = [];
    for ( var i = 0, len = items.length; i < len; i++ )
    {
        var item = items[ i ];
        if ( item === undefined )
        {
            continue;
        }

        arr_new.push( item );
    }

    return arr_new;
};


/**
 * Uses Object.getOwnPropertyDescriptor if available, otherwise provides our own
 * implementation to fall back on
 */
exports.getOwnPropertyDescriptor =
    ( can_define_prop && Object.getOwnPropertyDescriptor ) ||
    /**
     * If the environment does not support retrieving property descriptors
     * (ES5), then the following will be true:
     *  - get/set will always be undefined
     *  - writable, enumerable and configurable will always be true
     *  - value will be the value of the requested property on the given object
     *
     * @param  {!Object}  obj   object to check property on
     * @param  {string}   prop  property to retrieve descriptor for
     *
     * @return  {Object|undefined}  descriptor for requested property, if found
     */
    function( obj, prop )
    {
        if ( !Object.prototype.hasOwnProperty.call( obj, prop ) )
        {
            return undefined;
        }

        // fallback response
        return {
            get: undefined,
            set: undefined,

            writable:     true,
            enumerable:   true,
            configurable: true,

            value: obj[ prop ],
        };
    };


/**
 * Returns prototype of object, or undefined if unsupported
 */
exports.getPrototypeOf = Object.getPrototypeOf || function()
{
    return undefined;
};


/**
 * Travels down the prototype chain of the given object in search of the
 * requested property and returns its descriptor
 *
 * This operates as Object.getOwnPropertyDescriptor(), except that it traverses
 * the prototype chain. For environments that do not support __proto__, it will
 * not traverse the prototype chain and essentially serve as an alias for
 * getOwnPropertyDescriptor().
 *
 * This method has the option to ignore the base prototype. This is useful to,
 * for example, not catch properties like Object.prototype.toString() when
 * searching for 'toString' on an object.
 *
 * @param  {Object}   obj     object to check property on
 * @param  {string}   prop    property to retrieve descriptor for
 * @param  {boolean}  nobase  whether to ignore the base prototype
 *
 * @return  {Object}  descriptor for requested property or undefined if not found
 */
exports.getPropertyDescriptor = function( obj, prop, nobase )
{
    // false by default
    nobase = !!nobase;

    // note that this uses util's function, not Object's
    var desc = exports.getOwnPropertyDescriptor( obj, prop ),
        next = exports.getPrototypeOf( obj );

    // if we didn't find a descriptor and a prototype is available, recurse down
    // the prototype chain, ensuring that the next prototype has a prototype if
    // the base is to be excluded
    if ( !desc && next && ( !nobase || exports.getPrototypeOf( next ) ) )
    {
        return exports.getPropertyDescriptor( next, prop, nobase );
    }

    // return the descriptor or undefined if no prototype is available
    return desc;
};


/**
 * Indicates whether or not the getPropertyDescriptor method is capable of
 * traversing the prototype chain
 */
exports.defineSecureProp( exports.getPropertyDescriptor, 'canTraverse',
    ( Object.getPrototypeOf ) ? true : false
);


/**
 * Appropriately returns defineSecureProp implementation to avoid check on
 * each invocation
 *
 * @return  {function( Object, string, * )}
 */
function getDefineSecureProp()
{
    // falls back to simply defining a normal property
    var fallback = function( obj, prop, value )
    {
        obj[ prop ] = value;
    };

    if ( !can_define_prop )
    {
        return fallback;
    }
    else
    {
        // uses ECMAScript 5's Object.defineProperty() method
        return function( obj, prop, value )
        {
            Object.defineProperty( obj, prop,
            {
                value: value,

                enumerable:   false,
                writable:     false,
                configurable: false,
            } );
        };
    }
}


},{"./prop_parser":15,"./util/Global":17}],17:[function(require,module,exports){
/**
 * Global scope handling
 *
 *  Copyright (C) 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// retrieve global scope; works with ES5 strict mode
(0,eval)( 'var _the_global=this' );

// prototype to allow us to augment the global scope for our own purposes
// without polluting the global scope
function _G() {}
_G.prototype = _the_global;


/**
 * Provides access to and augmentation of global variables
 *
 * This provides a static method to consistently provide access to the
 * object representing the global scope, regardless of environment. Through
 * instantiation, its API permits augmenting a local object whose prototype
 * is the global scope, providing alternatives to variables that do not
 * exist.
 */
function Global()
{
    // allows omitting `new` keyword, consistent with ease.js style
    if ( !( this instanceof Global ) )
    {
        return new Global();
    }

    // do not pollute the global scope (previously, _the_global was used as
    // the prototype for a new object to take advantage of native overrides,
    // but unfortunately IE<=8 did not support this and always returned
    // undefined values from the prototype).
    this._alt = {};
}


/**
 * Provides consistent access to the global scope through all ECMAScript
 * versions, for any root variable name, and works with ES5 strict mode.
 *
 * As an example, Node.js exposes the variable `root` to represent global
 * scope, but browsers expose `window`. Further, ES5 strict mode will
 * provide an error when checking whether `typeof SomeGlobalVar ===
 * 'undefined'`.
 *
 * @return  {Object}  global object
 */
Global.expose = function()
{
    return _the_global;
};


Global.prototype = {
    /**
     * Provide a value for the provided global variable name if it is not
     * defined
     *
     * A function returning the value to assign to NAME should be provided,
     * ensuring that the alternative is never even evaluated unless it is
     * needed.
     *
     * The global scope will not be polluted with this alternative;
     * consequently, you must access the value using the `get` method.
     *
     * @param  {string}      name  global variable name
     * @param  {function()}  f     function returning value to assign
     *
     * @return  {Global}  self
     */
    provideAlt: function( name, f )
    {
        if ( ( _the_global[ name ] !== undefined )
            || ( this._alt[ name ] !== undefined )
        )
        {
            return;
        }

        this._alt[ name ] = f();
        return this;
    },


    /**
     * Retrieve global value or provided alternative
     *
     * This will take into account values provided via `provideAlt`; if no
     * alternative was provided, the request will be deleagated to the
     * global variable NAME, which may or may not be undefined.
     *
     * No error will be thrown if NAME is not globally defined.
     *
     * @param  {string}  name  global variable name
     *
     * @return  {*}  value associated with global variable NAME or
     *               its provided alternative
     */
    get: function( name )
    {
        return ( this._alt[ name ] !== undefined )
            ? this._alt[ name ]
            : _the_global[ name ];
    },
};

module.exports = Global;


},{}],18:[function(require,module,exports){
/**
 * Forward-compatible subset of ES6 Symbol
 *
 *  Copyright (C) 2010, 2011, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * This is *not* intended to be a complete implementation; it merely
 * performs what is needed for ease.js, preferring the benefits of the ES6
 * Symbol implementation while falling back to sane ES5 and ES3 options.
 */

// to be used if there is no global Symbol available
var FallbackSymbol = require( './symbol/FallbackSymbol' );

var _root = require( './Global' ).expose();
module.exports = _root.Symbol || FallbackSymbol;


},{"./Global":17,"./symbol/FallbackSymbol":19}],19:[function(require,module,exports){
/**
 * Forward-compatible subset of ES6 Symbol for pre-ES6 environments
 *
 *  Copyright (C) 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * This is *not* intended to be a complete implementation; it merely
 * performs what is needed for ease.js. In particular, this pre-ES6
 * implementation will simply generate a random string to be used as a key;
 * the caller is expected to add the key to the destination object as
 * non-enumerable, if supported by the environment.
 */

// ensures that, so long as these methods have not been overwritten by the
// time ease.js is loaded, we will maintain a proper reference
var _random = Math.random,
    _floor  = Math.floor;

// prefix used for all generated symbol strings (this string is highly
// unlikely to exist in practice); it will produce a string containing a
// non-printable ASCII character that is *not* the null byte
var _root = ' ' + String.fromCharCode(
    _floor( _random() * 10 ) % 31 + 1
) + '$';


/**
 * Generate a pseudo-random string (with a common prefix) to be used as an
 * object key
 *
 * The returned key is unique so long as Math.{random,floor} are reliable.
 * This will be true so long as (1) the runtime provides a reliable
 * implementation and (2) Math.{floor,random} have not been overwritten at
 * the time that this module is loaded. This module stores an internal
 * reference to this methods, so malicious code loaded after this module
 * will not be able to compromise the return value.
 *
 * Note that the returned string is not wholly random: a common prefix is
 * used to ensure that collisions with other keys on objects is highly
 * unlikely; you should not rely on this behavior, though, as it is an
 * implementation detail that may change in the future.
 *
 * @return  {string}  pseudo-random string with common prefix
 */
function FallbackSymbol()
{
    if ( !( this instanceof FallbackSymbol ) )
    {
        return new FallbackSymbol();
    }

    this.___$$id$$ = ( _root + _floor( _random() * 1e8 ) );
}


FallbackSymbol.prototype = {
    /**
     * Return random identifier
     *
     * This is convenient, as it allows us to both treat the symbol as an
     * object of type FallbackSymbol and use the symbol as a key (since
     * doing so will automatically call this method).
     *
     * @return  {string}  random identifier
     */
    toString: function()
    {
        return this.___$$id$$;
    },
};


module.exports = FallbackSymbol;


},{}],20:[function(require,module,exports){
/**
 * Provides version information
 *
 *  Copyright (C) 2010, 2011, 2012, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify it under the
 *  terms of the GNU General Public License as published by the Free Software
 *  Foundation, either version 3 of the License, or (at your option) any later
 *  version.
 *
 *  This program is distributed in the hope that it will be useful, but WITHOUT
 *  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 *  FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
 *  more details.
 *
 *  You should have received a copy of the GNU General Public License along with
 *  this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @author  Mike Gerwitz
 */

var major  = 0,
    minor  = 2,
    rev    = 7,
    suffix = '',

    version = [ major, minor, rev, suffix ];

version.major  = major;
version.minor  = minor;
version.rev    = rev;
version.suffix = suffix;

version.toString = function()
{
    return this.join( '.' )
        .replace( /\.([^.]*)$/, '-$1' )
        .replace( /-$/, '' );
};

module.exports = version;

},{}],21:[function(require,module,exports){
/**
 * ease.js warning system
 *
 *  Copyright (C) 2011, 2012, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

module.exports = {
    Warning: require( './warn/Warning' ),

    DismissiveHandler: require( './warn/DismissiveHandler' ),
    LogHandler:        require( './warn/LogHandler' ),
    ThrowHandler:      require( './warn/ThrowHandler' ),
};


},{"./warn/DismissiveHandler":22,"./warn/LogHandler":23,"./warn/ThrowHandler":24,"./warn/Warning":25}],22:[function(require,module,exports){
/**
 * Dismissive warning handler
 *
 *  Copyright (C) 2010, 2011, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


/**
 * Warning handler that dismisses (ignores) all warnings
 *
 * This is useful in a production environment.
 */
function DismissiveHandler()
{
    if ( !( this instanceof DismissiveHandler ) )
    {
        return new DismissiveHandler();
    }
}


DismissiveHandler.prototype = {
    /**
     * Handle a warning
     *
     * @param   {Warning}   warning  warning to handle
     * @return  {undefined}
     */
    handle: function( warning )
    {
        // intentionally do nothing
    },
}

module.exports = DismissiveHandler;


},{}],23:[function(require,module,exports){
/**
 * Logging warning handler
 *
 *  Copyright (C) 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


/**
 * Warning handler that logs all warnings to a console
 *
 * @param  {Object}  console  console with a warn or log method
 */
function LogHandler( console )
{
    if ( !( this instanceof LogHandler ) )
    {
        return new LogHandler( console );
    }

    this._console = console || {};
}


LogHandler.prototype = {
    /**
     * Handle a warning
     *
     * Will attempt to log using console.warn(), falling back to
     * console.log() if necessary and aborting entirely if neither is
     * available.
     *
     * This is useful as a default option to bring problems to the
     * developer's attention without affecting the control flow of the
     * software.
     *
     * @param   {Warning}   warning  warning to handle
     * @return  {undefined}
     */
    handle: function( warning )
    {
        var dest = this._console.warn || this._console.log;
        dest && dest.call( this._console,
            'Warning: ' + warning.message
        );
    },
}

module.exports = LogHandler;


},{}],24:[function(require,module,exports){
/**
 * Throwing warning handler
 *
 *  Copyright (C) 2010, 2011, 2013, 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


/**
 * Warning handler that throws all warnings as exceptions
 */
function ThrowHandler()
{
    if ( !( this instanceof ThrowHandler ) )
    {
        return new ThrowHandler();
    }
}


ThrowHandler.prototype = {
    /**
     * Handle a warning
     *
     * Throws the error associated with the warning.
     *
     * This handler is useful for development and will ensure that problems
     * are brought to the attention of the developer.
     *
     * @param   {Warning}   warning  warning to handle
     * @return  {undefined}
     */
    handle: function( warning )
    {
        throw warning.getError();
    },
}

module.exports = ThrowHandler;


},{}],25:[function(require,module,exports){
/**
 * Warning prototype
 *
 *  Copyright (C) 2014 Free Software Foundation, Inc.
 *
 *  This file is part of GNU ease.js.
 *
 *  ease.js is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


/**
 * Permits wrapping an exception as a warning
 *
 * Warnings are handled differently by the system, depending on the warning
 * level that has been set.
 *
 * @param {Error} e exception (error) to wrap
 *
 * @return {Warning} new warning instance
 *
 * @constructor
 */
function Warning( e )
{
    // allow instantiation without use of 'new' keyword
    if ( !( this instanceof Warning ) )
    {
        return new Warning( e );
    }

    // ensure we're wrapping an exception
    if ( !( e instanceof Error ) )
    {
        throw TypeError( "Must provide exception to wrap" );
    }

    Error.prototype.constructor.call( this, e.message );

    // copy over the message for convenience
    this.message = e.message;
    this.name    = 'Warning';
    this._error  = e;

    this.stack = e.stack &&
        e.stack.replace( /^.*?\n+/,
            this.name + ': ' + this.message + "\n"
        );
};

// ensures the closest compatibility...just be careful not to modify Warning's
// prototype
Warning.prototype = Error();
Warning.prototype.constructor = Warning;
Warning.prototype.name = 'Warning';


/**
 * Return the error wrapped by the warning
 *
 * @return {Error} wrapped error
 */
Warning.prototype.getError = function()
{
    return this._error;
};


module.exports = Warning;


},{}],26:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],27:[function(require,module,exports){
module.exports = LRUCache

// This will be a proper iterable 'Map' in engines that support it,
// or a fakey-fake PseudoMap in older versions.
var Map = require('pseudomap')
var util = require('util')

// A linked list to keep track of recently-used-ness
var Yallist = require('yallist')

// use symbols if possible, otherwise just _props
var symbols = {}
var hasSymbol = typeof Symbol === 'function'
var makeSymbol
if (hasSymbol) {
  makeSymbol = function (key) {
    return Symbol.for(key)
  }
} else {
  makeSymbol = function (key) {
    return '_' + key
  }
}

function priv (obj, key, val) {
  var sym
  if (symbols[key]) {
    sym = symbols[key]
  } else {
    sym = makeSymbol(key)
    symbols[key] = sym
  }
  if (arguments.length === 2) {
    return obj[sym]
  } else {
    obj[sym] = val
    return val
  }
}

function naiveLength () { return 1 }

// lruList is a yallist where the head is the youngest
// item, and the tail is the oldest.  the list contains the Hit
// objects as the entries.
// Each Hit object has a reference to its Yallist.Node.  This
// never changes.
//
// cache is a Map (or PseudoMap) that matches the keys to
// the Yallist.Node object.
function LRUCache (options) {
  if (!(this instanceof LRUCache)) {
    return new LRUCache(options)
  }

  if (typeof options === 'number') {
    options = { max: options }
  }

  if (!options) {
    options = {}
  }

  var max = priv(this, 'max', options.max)
  // Kind of weird to have a default max of Infinity, but oh well.
  if (!max ||
      !(typeof max === 'number') ||
      max <= 0) {
    priv(this, 'max', Infinity)
  }

  var lc = options.length || naiveLength
  if (typeof lc !== 'function') {
    lc = naiveLength
  }
  priv(this, 'lengthCalculator', lc)

  priv(this, 'allowStale', options.stale || false)
  priv(this, 'maxAge', options.maxAge || 0)
  priv(this, 'dispose', options.dispose)
  this.reset()
}

// resize the cache when the max changes.
Object.defineProperty(LRUCache.prototype, 'max', {
  set: function (mL) {
    if (!mL || !(typeof mL === 'number') || mL <= 0) {
      mL = Infinity
    }
    priv(this, 'max', mL)
    trim(this)
  },
  get: function () {
    return priv(this, 'max')
  },
  enumerable: true
})

Object.defineProperty(LRUCache.prototype, 'allowStale', {
  set: function (allowStale) {
    priv(this, 'allowStale', !!allowStale)
  },
  get: function () {
    return priv(this, 'allowStale')
  },
  enumerable: true
})

Object.defineProperty(LRUCache.prototype, 'maxAge', {
  set: function (mA) {
    if (!mA || !(typeof mA === 'number') || mA < 0) {
      mA = 0
    }
    priv(this, 'maxAge', mA)
    trim(this)
  },
  get: function () {
    return priv(this, 'maxAge')
  },
  enumerable: true
})

// resize the cache when the lengthCalculator changes.
Object.defineProperty(LRUCache.prototype, 'lengthCalculator', {
  set: function (lC) {
    if (typeof lC !== 'function') {
      lC = naiveLength
    }
    if (lC !== priv(this, 'lengthCalculator')) {
      priv(this, 'lengthCalculator', lC)
      priv(this, 'length', 0)
      priv(this, 'lruList').forEach(function (hit) {
        hit.length = priv(this, 'lengthCalculator').call(this, hit.value, hit.key)
        priv(this, 'length', priv(this, 'length') + hit.length)
      }, this)
    }
    trim(this)
  },
  get: function () { return priv(this, 'lengthCalculator') },
  enumerable: true
})

Object.defineProperty(LRUCache.prototype, 'length', {
  get: function () { return priv(this, 'length') },
  enumerable: true
})

Object.defineProperty(LRUCache.prototype, 'itemCount', {
  get: function () { return priv(this, 'lruList').length },
  enumerable: true
})

LRUCache.prototype.rforEach = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = priv(this, 'lruList').tail; walker !== null;) {
    var prev = walker.prev
    forEachStep(this, fn, walker, thisp)
    walker = prev
  }
}

function forEachStep (self, fn, node, thisp) {
  var hit = node.value
  if (isStale(self, hit)) {
    del(self, node)
    if (!priv(self, 'allowStale')) {
      hit = undefined
    }
  }
  if (hit) {
    fn.call(thisp, hit.value, hit.key, self)
  }
}

LRUCache.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = priv(this, 'lruList').head; walker !== null;) {
    var next = walker.next
    forEachStep(this, fn, walker, thisp)
    walker = next
  }
}

LRUCache.prototype.keys = function () {
  return priv(this, 'lruList').toArray().map(function (k) {
    return k.key
  }, this)
}

LRUCache.prototype.values = function () {
  return priv(this, 'lruList').toArray().map(function (k) {
    return k.value
  }, this)
}

LRUCache.prototype.reset = function () {
  if (priv(this, 'dispose') &&
      priv(this, 'lruList') &&
      priv(this, 'lruList').length) {
    priv(this, 'lruList').forEach(function (hit) {
      priv(this, 'dispose').call(this, hit.key, hit.value)
    }, this)
  }

  priv(this, 'cache', new Map()) // hash of items by key
  priv(this, 'lruList', new Yallist()) // list of items in order of use recency
  priv(this, 'length', 0) // length of items in the list
}

LRUCache.prototype.dump = function () {
  return priv(this, 'lruList').map(function (hit) {
    if (!isStale(this, hit)) {
      return {
        k: hit.key,
        v: hit.value,
        e: hit.now + (hit.maxAge || 0)
      }
    }
  }, this).toArray().filter(function (h) {
    return h
  })
}

LRUCache.prototype.dumpLru = function () {
  return priv(this, 'lruList')
}

LRUCache.prototype.inspect = function (n, opts) {
  var str = 'LRUCache {'
  var extras = false

  var as = priv(this, 'allowStale')
  if (as) {
    str += '\n  allowStale: true'
    extras = true
  }

  var max = priv(this, 'max')
  if (max && max !== Infinity) {
    if (extras) {
      str += ','
    }
    str += '\n  max: ' + util.inspect(max, opts)
    extras = true
  }

  var maxAge = priv(this, 'maxAge')
  if (maxAge) {
    if (extras) {
      str += ','
    }
    str += '\n  maxAge: ' + util.inspect(maxAge, opts)
    extras = true
  }

  var lc = priv(this, 'lengthCalculator')
  if (lc && lc !== naiveLength) {
    if (extras) {
      str += ','
    }
    str += '\n  length: ' + util.inspect(priv(this, 'length'), opts)
    extras = true
  }

  var didFirst = false
  priv(this, 'lruList').forEach(function (item) {
    if (didFirst) {
      str += ',\n  '
    } else {
      if (extras) {
        str += ',\n'
      }
      didFirst = true
      str += '\n  '
    }
    var key = util.inspect(item.key).split('\n').join('\n  ')
    var val = { value: item.value }
    if (item.maxAge !== maxAge) {
      val.maxAge = item.maxAge
    }
    if (lc !== naiveLength) {
      val.length = item.length
    }
    if (isStale(this, item)) {
      val.stale = true
    }

    val = util.inspect(val, opts).split('\n').join('\n  ')
    str += key + ' => ' + val
  })

  if (didFirst || extras) {
    str += '\n'
  }
  str += '}'

  return str
}

LRUCache.prototype.set = function (key, value, maxAge) {
  maxAge = maxAge || priv(this, 'maxAge')

  var now = maxAge ? Date.now() : 0
  var len = priv(this, 'lengthCalculator').call(this, value, key)

  if (priv(this, 'cache').has(key)) {
    if (len > priv(this, 'max')) {
      del(this, priv(this, 'cache').get(key))
      return false
    }

    var node = priv(this, 'cache').get(key)
    var item = node.value

    // dispose of the old one before overwriting
    if (priv(this, 'dispose')) {
      priv(this, 'dispose').call(this, key, item.value)
    }

    item.now = now
    item.maxAge = maxAge
    item.value = value
    priv(this, 'length', priv(this, 'length') + (len - item.length))
    item.length = len
    this.get(key)
    trim(this)
    return true
  }

  var hit = new Entry(key, value, len, now, maxAge)

  // oversized objects fall out of cache automatically.
  if (hit.length > priv(this, 'max')) {
    if (priv(this, 'dispose')) {
      priv(this, 'dispose').call(this, key, value)
    }
    return false
  }

  priv(this, 'length', priv(this, 'length') + hit.length)
  priv(this, 'lruList').unshift(hit)
  priv(this, 'cache').set(key, priv(this, 'lruList').head)
  trim(this)
  return true
}

LRUCache.prototype.has = function (key) {
  if (!priv(this, 'cache').has(key)) return false
  var hit = priv(this, 'cache').get(key).value
  if (isStale(this, hit)) {
    return false
  }
  return true
}

LRUCache.prototype.get = function (key) {
  return get(this, key, true)
}

LRUCache.prototype.peek = function (key) {
  return get(this, key, false)
}

LRUCache.prototype.pop = function () {
  var node = priv(this, 'lruList').tail
  if (!node) return null
  del(this, node)
  return node.value
}

LRUCache.prototype.del = function (key) {
  del(this, priv(this, 'cache').get(key))
}

LRUCache.prototype.load = function (arr) {
  // reset the cache
  this.reset()

  var now = Date.now()
  // A previous serialized cache has the most recent items first
  for (var l = arr.length - 1; l >= 0; l--) {
    var hit = arr[l]
    var expiresAt = hit.e || 0
    if (expiresAt === 0) {
      // the item was created without expiration in a non aged cache
      this.set(hit.k, hit.v)
    } else {
      var maxAge = expiresAt - now
      // dont add already expired items
      if (maxAge > 0) {
        this.set(hit.k, hit.v, maxAge)
      }
    }
  }
}

LRUCache.prototype.prune = function () {
  var self = this
  priv(this, 'cache').forEach(function (value, key) {
    get(self, key, false)
  })
}

function get (self, key, doUse) {
  var node = priv(self, 'cache').get(key)
  if (node) {
    var hit = node.value
    if (isStale(self, hit)) {
      del(self, node)
      if (!priv(self, 'allowStale')) hit = undefined
    } else {
      if (doUse) {
        priv(self, 'lruList').unshiftNode(node)
      }
    }
    if (hit) hit = hit.value
  }
  return hit
}

function isStale (self, hit) {
  if (!hit || (!hit.maxAge && !priv(self, 'maxAge'))) {
    return false
  }
  var stale = false
  var diff = Date.now() - hit.now
  if (hit.maxAge) {
    stale = diff > hit.maxAge
  } else {
    stale = priv(self, 'maxAge') && (diff > priv(self, 'maxAge'))
  }
  return stale
}

function trim (self) {
  if (priv(self, 'length') > priv(self, 'max')) {
    for (var walker = priv(self, 'lruList').tail;
         priv(self, 'length') > priv(self, 'max') && walker !== null;) {
      // We know that we're about to delete this one, and also
      // what the next least recently used key will be, so just
      // go ahead and set it now.
      var prev = walker.prev
      del(self, walker)
      walker = prev
    }
  }
}

function del (self, node) {
  if (node) {
    var hit = node.value
    if (priv(self, 'dispose')) {
      priv(self, 'dispose').call(this, hit.key, hit.value)
    }
    priv(self, 'length', priv(self, 'length') - hit.length)
    priv(self, 'cache').delete(hit.key)
    priv(self, 'lruList').removeNode(node)
  }
}

// classy, since V8 prefers predictable objects.
function Entry (key, value, length, now, maxAge) {
  this.key = key
  this.value = value
  this.length = length
  this.now = now
  this.maxAge = maxAge || 0
}

},{"pseudomap":29,"util":32,"yallist":33}],28:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],29:[function(require,module,exports){
(function (process){
if (process.env.npm_package_name === 'pseudomap' &&
    process.env.npm_lifecycle_script === 'test')
  process.env.TEST_PSEUDOMAP = 'true'

if (typeof Map === 'function' && !process.env.TEST_PSEUDOMAP) {
  module.exports = Map
} else {
  module.exports = require('./pseudomap')
}

}).call(this,require('_process'))
},{"./pseudomap":30,"_process":28}],30:[function(require,module,exports){
var hasOwnProperty = Object.prototype.hasOwnProperty

module.exports = PseudoMap

function PseudoMap (set) {
  if (!(this instanceof PseudoMap)) // whyyyyyyy
    throw new TypeError("Constructor PseudoMap requires 'new'")

  this.clear()

  if (set) {
    if ((set instanceof PseudoMap) ||
        (typeof Map === 'function' && set instanceof Map))
      set.forEach(function (value, key) {
        this.set(key, value)
      }, this)
    else if (Array.isArray(set))
      set.forEach(function (kv) {
        this.set(kv[0], kv[1])
      }, this)
    else
      throw new TypeError('invalid argument')
  }
}

PseudoMap.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this
  Object.keys(this._data).forEach(function (k) {
    if (k !== 'size')
      fn.call(thisp, this._data[k].value, this._data[k].key)
  }, this)
}

PseudoMap.prototype.has = function (k) {
  return !!find(this._data, k)
}

PseudoMap.prototype.get = function (k) {
  var res = find(this._data, k)
  return res && res.value
}

PseudoMap.prototype.set = function (k, v) {
  set(this._data, k, v)
}

PseudoMap.prototype.delete = function (k) {
  var res = find(this._data, k)
  if (res) {
    delete this._data[res._index]
    this._data.size--
  }
}

PseudoMap.prototype.clear = function () {
  var data = Object.create(null)
  data.size = 0

  Object.defineProperty(this, '_data', {
    value: data,
    enumerable: false,
    configurable: true,
    writable: false
  })
}

Object.defineProperty(PseudoMap.prototype, 'size', {
  get: function () {
    return this._data.size
  },
  set: function (n) {},
  enumerable: true,
  configurable: true
})

PseudoMap.prototype.values =
PseudoMap.prototype.keys =
PseudoMap.prototype.entries = function () {
  throw new Error('iterators are not implemented in this version')
}

// Either identical, or both NaN
function same (a, b) {
  return a === b || a !== a && b !== b
}

function Entry (k, v, i) {
  this.key = k
  this.value = v
  this._index = i
}

function find (data, k) {
  for (var i = 0, s = '_' + k, key = s;
       hasOwnProperty.call(data, key);
       key = s + i++) {
    if (same(data[key].key, k))
      return data[key]
  }
}

function set (data, k, v) {
  for (var i = 0, s = '_' + k, key = s;
       hasOwnProperty.call(data, key);
       key = s + i++) {
    if (same(data[key].key, k)) {
      data[key].value = v
      return
    }
  }
  data.size++
  data[key] = new Entry(k, v, key)
}

},{}],31:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],32:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":31,"_process":28,"inherits":26}],33:[function(require,module,exports){
module.exports = Yallist

Yallist.Node = Node
Yallist.create = Yallist

function Yallist (list) {
  var self = this
  if (!(self instanceof Yallist)) {
    self = new Yallist()
  }

  self.tail = null
  self.head = null
  self.length = 0

  if (list && typeof list.forEach === 'function') {
    list.forEach(function (item) {
      self.push(item)
    })
  } else if (arguments.length > 0) {
    for (var i = 0, l = arguments.length; i < l; i++) {
      self.push(arguments[i])
    }
  }

  return self
}

Yallist.prototype.removeNode = function (node) {
  if (node.list !== this) {
    throw new Error('removing node which does not belong to this list')
  }

  var next = node.next
  var prev = node.prev

  if (next) {
    next.prev = prev
  }

  if (prev) {
    prev.next = next
  }

  if (node === this.head) {
    this.head = next
  }
  if (node === this.tail) {
    this.tail = prev
  }

  node.list.length --
  node.next = null
  node.prev = null
  node.list = null
}

Yallist.prototype.unshiftNode = function (node) {
  if (node === this.head) {
    return
  }

  if (node.list) {
    node.list.removeNode(node)
  }

  var head = this.head
  node.list = this
  node.next = head
  if (head) {
    head.prev = node
  }

  this.head = node
  if (!this.tail) {
    this.tail = node
  }
  this.length ++
}

Yallist.prototype.pushNode = function (node) {
  if (node === this.tail) {
    return
  }

  if (node.list) {
    node.list.removeNode(node)
  }

  var tail = this.tail
  node.list = this
  node.prev = tail
  if (tail) {
    tail.next = node
  }

  this.tail = node
  if (!this.head) {
    this.head = node
  }
  this.length ++
}

Yallist.prototype.push = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    push(this, arguments[i])
  }
  return this.length
}

Yallist.prototype.unshift = function () {
  for (var i = 0, l = arguments.length; i < l; i++) {
    unshift(this, arguments[i])
  }
  return this.length
}

Yallist.prototype.pop = function () {
  if (!this.tail)
    return undefined

  var res = this.tail.value
  this.tail = this.tail.prev
  this.tail.next = null
  this.length --
  return res
}

Yallist.prototype.shift = function () {
  if (!this.head)
    return undefined

  var res = this.head.value
  this.head = this.head.next
  this.head.prev = null
  this.length --
  return res
}

Yallist.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = this.head, i = 0; walker !== null; i++) {
    fn.call(thisp, walker.value, i, this)
    walker = walker.next
  }
}

Yallist.prototype.forEachReverse = function (fn, thisp) {
  thisp = thisp || this
  for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
    fn.call(thisp, walker.value, i, this)
    walker = walker.prev
  }
}

Yallist.prototype.get = function (n) {
  for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.next
  }
  if (i === n && walker !== null) {
    return walker.value
  }
}

Yallist.prototype.getReverse = function (n) {
  for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
    // abort out of the list early if we hit a cycle
    walker = walker.prev
  }
  if (i === n && walker !== null) {
    return walker.value
  }
}

Yallist.prototype.map = function (fn, thisp) {
  thisp = thisp || this
  var res = new Yallist()
  for (var walker = this.head; walker !== null; ) {
    res.push(fn.call(thisp, walker.value, this))
    walker = walker.next
  }
  return res
}

Yallist.prototype.mapReverse = function (fn, thisp) {
  thisp = thisp || this
  var res = new Yallist()
  for (var walker = this.tail; walker !== null;) {
    res.push(fn.call(thisp, walker.value, this))
    walker = walker.prev
  }
  return res
}

Yallist.prototype.reduce = function (fn, initial) {
  var acc
  var walker = this.head
  if (arguments.length > 1) {
    acc = initial
  } else if (this.head) {
    walker = this.head.next
    acc = this.head.value
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = 0; walker !== null; i++) {
    acc = fn(acc, walker.value, i)
    walker = walker.next
  }

  return acc
}

Yallist.prototype.reduceReverse = function (fn, initial) {
  var acc
  var walker = this.tail
  if (arguments.length > 1) {
    acc = initial
  } else if (this.tail) {
    walker = this.tail.prev
    acc = this.tail.value
  } else {
    throw new TypeError('Reduce of empty list with no initial value')
  }

  for (var i = this.length - 1; walker !== null; i--) {
    acc = fn(acc, walker.value, i)
    walker = walker.prev
  }

  return acc
}

Yallist.prototype.toArray = function () {
  var arr = new Array(this.length)
  for (var i = 0, walker = this.head; walker !== null; i++) {
    arr[i] = walker.value
    walker = walker.next
  }
  return arr
}

Yallist.prototype.toArrayReverse = function () {
  var arr = new Array(this.length)
  for (var i = 0, walker = this.tail; walker !== null; i++) {
    arr[i] = walker.value
    walker = walker.prev
  }
  return arr
}

Yallist.prototype.slice = function (from, to) {
  to = to || this.length
  if (to < 0) {
    to += this.length
  }
  from = from || 0
  if (from < 0) {
    from += this.length
  }
  var ret = new Yallist()
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0
  }
  if (to > this.length) {
    to = this.length
  }
  for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
    walker = walker.next
  }
  for (; walker !== null && i < to; i++, walker = walker.next) {
    ret.push(walker.value)
  }
  return ret
}

Yallist.prototype.sliceReverse = function (from, to) {
  to = to || this.length
  if (to < 0) {
    to += this.length
  }
  from = from || 0
  if (from < 0) {
    from += this.length
  }
  var ret = new Yallist()
  if (to < from || to < 0) {
    return ret
  }
  if (from < 0) {
    from = 0
  }
  if (to > this.length) {
    to = this.length
  }
  for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
    walker = walker.prev
  }
  for (; walker !== null && i > from; i--, walker = walker.prev) {
    ret.push(walker.value)
  }
  return ret
}

Yallist.prototype.reverse = function () {
  var head = this.head
  var tail = this.tail
  for (var walker = head; walker !== null; walker = walker.prev) {
    var p = walker.prev
    walker.prev = walker.next
    walker.next = p
  }
  this.head = tail
  this.tail = head
  return this
}

function push (self, item) {
  self.tail = new Node(item, self.tail, null, self)
  if (!self.head) {
    self.head = self.tail
  }
  self.length ++
}

function unshift (self, item) {
  self.head = new Node(item, null, self.head, self)
  if (!self.tail) {
    self.tail = self.head
  }
  self.length ++
}

function Node (value, prev, next, list) {
  if (!(this instanceof Node)) {
    return new Node(value, prev, next, list)
  }

  this.list = list
  this.value = value

  if (prev) {
    prev.next = this
    this.prev = prev
  } else {
    this.prev = null
  }

  if (next) {
    next.prev = this
    this.next = next
  } else {
    this.next = null
  }
}

},{}],34:[function(require,module,exports){
var GraphicsEngineController = require('./worldgraphics/graphics-engine-controller')


$(document).ready(function () {
    var canvas = document.getElementById("simulation-render-target")
    var controller = GraphicsEngineController(canvas)

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
		window.onresize = function () {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
		}

    $("#toolbar-bottom .tool").click(function (evt) {
        $("#toolbar-bottom .tool").removeClass("selected")
        $(this).addClass("selected")
    })
    $("#toolbar-bottom .modifier").click(function (evt) {
        $("#toolbar-bottom .modifier").removeClass("selected")
        $(this).addClass("selected")
    })

    $("#add-raise").click(function (evt){controller.setUse("ADD")})
    $("#delete-lower").click(function (evt){controller.setUse("DELETE")})
    $("#camera").click(function (evt){controller.setTool("CAMERA")})
    $("#inspect").click(function (evt){controller.setTool("INSPECT")})

});

},{"./worldgraphics/graphics-engine-controller":35}],35:[function(require,module,exports){
var Class = require("easejs").Class
var WorldRenderer = require("./world-renderer")
//var TimelineFetcher = require("../networking/timeline-fetcher").new()
//var WorldStateFetcher = require("../networking/world-state-fetcher").new()

/*
GraphicsEngineController: Holds the state of the camera, listens for input events
and controlls the render engine accordingly. This class also keeps track of
the time stream that the client's simulation is currently in and applies state
change operations to the renderer to move the view through time.

param renderTarget: The DOM element that the rendering engine will be bound to.
*/
module.exports = Class("GraphicsEngineController", {
    'private _renderEngine': null,
    'private _camera': null,
    'private _camPos': null,
    'private _renderer': null,
    'private _smellMode': false,
    'private _timeLine': null,
    'private _turn': 0,
    'private _rtarget': null,
    'private _tool': "CAMERA",
    'private _use': "ADD",

    'private _popupStats': function (stats) {
        $('#cell-stats').show()

        $("div#cell-stats span#elevation").html(Math.round(100*stats.elevation)/100 + " meters");
        $("div#cell-stats span#cell-type").html(stats.type);
        $("div#cell-stats span#coords").html(stats.coords);
        $("div#cell-stats div#stat-listing").empty();
        $("div#cell-stats div#stat-listing").append("<h4>Contents:</h4>");

        for (var i in stats.contents) {
            var cont = stats.contents[i];
            var element = $("<div class='cell-content-list'> </div>");
            var health = cont.health;
            var type = cont.type;

            $("<span> Type: </span><span id='type'>" + type + "</span><br>").appendTo(element);
            $("<span> Health: </span><span id='health'>" + health + "</span>").appendTo(element);

            $("div#stat-listing").append(element);
        }
    },
    /*
    Bind key events to camera or interaction actions

    param scene: The scene for which the events are fire from.
    */
    'private _setupKeys': function(scene) {
        scene.actionManager = new BABYLON.ActionManager(scene)
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger,
            function (evt) {
                if(evt.sourceEvent.keyCode==16) {
                    this._camera.angularSensibilityX = 1000000000
                    this._camera.angularSensibilityY = 1000000000
                }
            }.bind(this)
        ))

        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger,
            function (evt) {
                if(evt.sourceEvent.keyCode==16) {
                    this._camera.angularSensibilityX = 1500
                    this._camera.angularSensibilityY = 1500
                }
            }.bind(this)
        ))
    },
    __construct: function(renderTarget) {
        var engine = new BABYLON.Engine(renderTarget, true)
        var scene  = new BABYLON.Scene(engine)
        var loader = new BABYLON.AssetsManager(scene)

        var camera = new BABYLON.ArcRotateCamera("camera", Math.PI/8,Math.PI/8,45, new BABYLON.Vector3(0,0,0), scene)
        camera.upperRadiusLimit = 55
        camera.lowerRadiusLimit = 15
        camera.upperBetaLimit = Math.PI/3
        camera.lowerBetaLimit = Math.PI/8

        camera.keysUp = []
        camera.keysDown = []
        camera.keysLeft = []
        camera.keysRight = []

        camera.panningSensibility = 100
        camera.angularSensibilityX = 1500
        camera.wheelPrecision = 25
        camera.attachControl(renderTarget)

        var renderer = WorldRenderer(renderTarget, engine, camera, scene, loader)

        this._renderEngine = engine
        this._camera = camera
        this._renderer = renderer

        this._setupKeys(scene)
        this.startSimulationEngine()

        $("#simulation-render-target").click(function(evt){
            if(evt.ctrlKey)
                return
            if (this._tool == "CAMERA") {
                this._camera.angularSensibilityX = 1500
                this._camera.angularSensibilityY = 1500
            }
            else {
                this._camera.angularSensibilityX = 1000000000
                this._camera.angularSensibilityY = 1000000000

                if(this._tool == "INSPECT") {
                    console.log("INS")
                    var picked = scene.pick(evt.clientX, evt.clientY)
                    var coords = picked.pickedMesh.name.split(" ").map(function(x){return Number(x)})

                    stats = this._renderer.getCell(coords[0], coords[1])
                    this._popupStats(stats)
                }
                else {
                    if(this._use == "ADD") {

                    }
                    else if(this._use == "DELETE") {

                    }
                }
            }

        }.bind(this))

        setInterval(function () {
            //ajax call to update state
            //this._renderer.setWorldState(newstate)
        }, 1000)
    },
    /*
    Initialize the simulation view and start the render loop. Update the viewable
    chunks in the scene as the camera is moved
    */
    'public startSimulationEngine': function() {
        var loader = this._renderer.loadAssets()
        var control = this

        loader.onFinish = function() {
            this._renderer.updateView(0,0)
            this._camPos = {x: 0, y: 0}

            this._renderEngine.runRenderLoop(function () {
                this._renderer.renderWorld()

                var camdist  = Math.abs(this._camPos.x - this._camera.target.x)
                    camdist += Math.abs(this._camPos.y - this._camera.target.z)

                if(camdist > 2) {
                    var newx = Math.floor(this._camera.target.x)
                    var newy = Math.floor(this._camera.target.z)
                    this._renderer.updateView(newx, newy)
                    this._camPos = {x: newx, y: newy}
                }
            }.bind(this))
        }.bind(this)

        loader.load()
    },
    /*
    Turn off smell field and close cell status window
    */
    'public setDefaultRenderSettings': function() {
        this._smellMode = false
        this._cellStatus = null
    },
    /*
    Turn the smell field on and off
    */
    'public setSmellMode': function(setting) {
        this._smellMode = setting
    },
    /*
    Open the cell status window for the cell at point (x,y)

    param x: cell x position
    param y: cell y position
    */
    'public getcellStatus': function(x,y) {
        return renderer.getCell(x,y)
    },
    /*
    Move the camera to the point (x,y) and update the scene.

    param x: view x position
    param y: view y position
    */
    'public moveCamera': function(x,y) {
        renderer.updateCam(x,y)
    },
    'public setUse': function (use) {
        console.log(use + " MODE")
        this._use = use
    },
    'public setTool': function (tool) {
        console.log(tool + " TOOL")
        this._tool = tool
    }
})

},{"./world-renderer":39,"easejs":1}],36:[function(require,module,exports){
var Class = require("easejs").Class

module.exports = Class("WorldCell", {
    'private _health': 0,
    'private _type': null,
    'private _mesh': undefined,
    __construct: function(json_dump) {
        this._type = json_dump["type"]
    },
    'public get': function(key) {
        return this["_" + key]
    },
    'public applyDeltas': function (deltas, backstep) {

    },
    'public setMesh': function(mesh) {
        this._mesh = mesh
    },
    'public dispose': function() {
        if(this._mesh != undefined)
            this._mesh.dispose()
    },
    'public getStats': function() {
        return {
            "type": this._type
        }
    }
})

},{"easejs":1}],37:[function(require,module,exports){
var Class = require("easejs").Class
var CellContent = require("./cell-content")


module.exports = Class("WorldCell", {
    'private _contents': null,
    'private _type': null,
    'private _elevation': null,
    'private _coords': {'x': 0, 'y': 0},
    'private _mesh': undefined,
    __construct: function(json_dump, cellHeight_ref) {
        var contents = []
        for (content in json_dump["contents"])
            contents.push(CellContent(content))

        this._contents  = contents
        this.type       = json_dump["type"]
        this._elevation = json_dump["elevation"]
        this._coords    = json_dump["coords"]
    },
    'public get': function(key) {
        return this["_" + key]
    },
    'public applyDeltas': function (deltas, backstep) {

    },
    'public setMesh': function(mesh) {
        this._mesh = mesh
    },
    'public dispose': function() {
        if(this._mesh != undefined)
            this._mesh.dispose()
    },
    'public getStats': function() {
        var content_stats = []
        for(content in this._contents)
            this.content_stats.push(content.getStats())

        return {
            "contents": content_stats,
            "type": this._type,
            "height": this._height,
            "coords": {'x': this._coords["x"], 'y': this._coords["y"]}
        }
    }
})

},{"./cell-content":36,"easejs":1}],38:[function(require,module,exports){
var Class = require("easejs").Class
var WorldCell = require("./world-cell")

module.exports = Class("WorldState", {
    'private _standardHeight': null,
    'private _width': null,
    'private _length': null,
    'private _chunkSize': null,
    'private _waterThreshold': null,
    'private _rockThreshold': null,
    'private _seed': null,
    'private _seedSize': null,
    'private _cells': null,
    __construct: function(json_dump) {
        this._standardHeight = json_dump["standardHeight"]
        this._width          = json_dump["width"]
        this._length         = json_dump["length"]
        this._chunkSize      = json_dump["chunkSize"]
        this._waterThreshold = json_dump["waterThreshold"]
        this._rockThreshold  = json_dump["rockThreshold"]
        this._seed           = json_dump["seed"]
        this._seedSize       = json_dump["seedSize"]
        this._cells          = json_dump["cells"]

    },
    'public get': function(key) {
        return this["_" + key]
    },
    'public applyDeltas': function (deltas, backstep) {

    },
    'public getCell': function(x,y) {
        if(this._)
        return {

        }
    }
})

},{"./world-cell":37,"easejs":1}],39:[function(require,module,exports){
var Class = require("easejs").Class
var lru = require("lru-cache")

var WorldState = require("./primitives/world-state")
var Cell = require("./primitives/world-cell")


/*
World Renderer class contains the core functionality for
rendering the simulation. It recieves State and changes
from the graphics controller and updates the 3D view accordingly.
An LRU cache is used to store the cells in the view. This reduces the risk
of an unbounded growth of rendered chunks in the world.

param renderTarget: DOM element containing the canvas that will be rendered to.
param engine: An instance of the BABYLON.Engine class.
param camera: The BABYLON.Camera instance which the user views through
param scene: The BABYLON.Scene instance displaying the cells stored in loaded chunks.
*/
module.exports =  Class("WorldRenderer", {
    'private _scene': null,
    'private _sceneChunks': null,
    'private _worldState': null,
    'private _proto': {
        'WATER': null,
        'ROCK':  null,
        'GRASS': null,
        'BLOCK': null,
        'MUSH':  null,
        'PLANT': null,
        'ACTOR': null
    },
    /*
    Load the prototype mesh assets and return an event handle to be bound to
    a render loop initialtion function.
    */
    'public loadAssets': function() {
        var meta = document.querySelector("meta[name='mesh-dir']").getAttribute('content')
        var boletus_link = meta + "boletus_obj/"

        var loader = new BABYLON.AssetsManager(this._scene)
        /*

        var mushloader = loader.addMeshTask("MUSH", "", boletus_link, "boletus.obj")

        mushloader.onSuccess = function(t) {
            t.loadMeshes.forEach(function(m) {
                m.position = new BABYLON.Vector3(-10000,-10000,-10000)
                this._proto["MUSH"] = m
            }.bind(this))
        }.bind(this)
        */
        this._proto["MUSH"] = BABYLON.Mesh.CreateSphere("MUSH", 20, 1.0, this._scene)
        this._proto["MUSH"].position = new BABYLON.Vector3(-10000,-10000,-10000)

        this._proto["ACTOR"] = BABYLON.Mesh.CreateSphere("MUSH", 20, 1.0, this._scene)
        this._proto["ACTOR"].position = new BABYLON.Vector3(-10000,-10000,-10000)

        var actormat = new BABYLON.StandardMaterial("actormat", this._scene)

        this._proto["ACTOR"].material = actormat

        actormat.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0)
        actormat.diffuseColor = new BABYLON.Color3(0.7, 0.3, 0.3)
        return loader
    },
    __construct: function (renderTarget, engine, camera, scene) {
        //Configure the LRU cache holding the scene chunks.
        var options = {
            max: 100,
            dispose: function (key, chunk) {
                for (var row in chunk) {
                    cell = chunk[row].pop()
                    while (cell != undefined) {
                        for(c in cell.contents) {
                            var cont = cell.contents[c]
                            if(cont.mesh != undefined)
                                cont.mesh.dispose()
                        }
                        if(cell.mesh != undefined)
                            cell.mesh.dispose()
                        cell = chunk[row].pop()
                    }
                }
            }
        }
        this._sceneChunks = lru(options)
        //  placeholder state
        var seed = []
        var seedsize = 600
        for (var i = 0; i < seedsize; i++){
            var row = []
            for (var j = 0; j < seedsize; j++){
                row.push(Math.random())
            }
            seed.push(row)
        }

        var key
        var cells = {}

        for (var i = -5; i <= 5; i++) {
            for(var j = -5; j <= 5; j++) {
                key = j + " " + i
                cells[key] = {
                    elevation: 10,
                    contents: [],
                    coords: {'x': j, 'y': i},
                    type: "GRASS",
                    mesh: undefined
                }

                if(Math.random() < 0.1) {
                    cells[key].contents.push({
                        "type": "ACTOR",
                        "health": 50,
                        "mesh": undefined
                    })
                }
            }
        }

        var tempstate = WorldState({
            "standardHeight": 15,
            "width": 100000,
            "length": 100000,
            "chunkSize": 6,
            "waterThreshold": 0.2,
            "rockThreshold": 0.175,
            "seed": seed,
            "seedSize": seedsize,
            "cells": cells
        })

        this._worldState = tempstate
        //  end placeholder state
        //Basic condiguration for the render engine.
        var light = new BABYLON.DirectionalLight("light", new BABYLON.Vector3(0.1,-1,0.1), scene)

        //Define cell block prototypes
        var water = BABYLON.Mesh.CreateBox("WATER", 1.0, scene)
        var rock  = BABYLON.Mesh.CreateBox( "ROCK", 1.0, scene)
        var grass = BABYLON.Mesh.CreateBox("GRASS", 1.0, scene)
        //Define materials for each cell type
        var watermat = new BABYLON.StandardMaterial("watermat", scene)
        var rockmat  = new BABYLON.StandardMaterial( "rockmat", scene)
        var grassmat = new BABYLON.StandardMaterial("grassmat", scene)


        water.material = watermat
        rock.material  = rockmat
        grass.material = grassmat

        watermat.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0)
        rockmat.specularColor  = new BABYLON.Color3(0.0, 0.0, 0.0)
        grassmat.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0)

        watermat.diffuseColor = new BABYLON.Color3(0.0, 0.8, 1.0)
        rockmat.diffuseColor  = new BABYLON.Color3(0.3, 0.3, 0.3)
        grassmat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.0)

        //Place prototype meshes out of sight.
        water.position = new BABYLON.Vector3(-10000,-10000,-10000)
        rock.position  = new BABYLON.Vector3(-10000,-10000,-10000)
        grass.position = new BABYLON.Vector3(-10000,-10000,-10000)

        this._proto["WATER"] = water
        this._proto["ROCK"]  = rock
        this._proto["GRASS"] = grass

        this._scene = scene
    },
    /*
    Terrain generation function. Produces a cell either from the ones defined
    in the world's state or otherwise generated formulaically.

    param x: Cell x coordinate
    param y: Cell y coordinate

    out: Cell configuration data.
    */
    'private _terrainGen': function(x,y) {
        var cx = Math.floor(x)
        var cy = Math.floor(y)

        var val = 0
        var cell = this._worldState.get("cells")[cx + " " + cy]
        var tgen = this._computeCell(cx,cy)

        if(tgen == null)
            return null

        if(cell != undefined)
            return cell

        val = val + tgen.val*this._worldState.get("standardHeight")
        var tpe = "GRASS"

        if(tgen.val <= 0.2)
            tpe = "WATER"
        else if(tgen.grad > 0.175)
            tpe = "ROCK"

        if(val < 1)
          val = 1

        cell = {
            elevation: val + 1.0,
            contents: [],
            coords: {'x': x, 'y': y},
            type: tpe,
            mesh: undefined,
        }

        return cell
    },
    /*
    Cosine interpolation used for smoooth terrain map generation.

    param v0: Inital value
    param v1: Final value
    param t: Amount between 0 and 1 from inital value to final value.

    Out.val: Interpolated value
    Out.slope: Derivative of interpolation
    */
    'private _cosineInterp': function(v0, v1, t) {
        var phase = (1-Math.cos(t*Math.PI))/2.0
        var dphase = Math.sin(t*Math.PI)/2.0
        return {
            val: v0*(1-phase) + v1*phase,
            slope: -v0*dphase + v1*dphase,
        }
    },
    /*
    Core terrain map generation by interpolating between points in a randomly
    generated matrix.

    param x: Cell x coordinate
    param y: Cell y coordinate

    Out.val: Height of the cell between 0 and 1.
    Out.grad: Gradient magniute of the terrain field.
    */
    'private _computeCell': function (x,y) {
        var seed        = this._worldState.get("seed")
        var seedsize    = this._worldState.get("seedSize")
        var worldWidth  = this._worldState.get("width")
        var worldLength = this._worldState.get("length")
        var chunksize   = this._worldState.get("chunkSize")

        var cellx = Math.round(x + worldWidth/2)
        var celly = Math.round(y + worldLength/2)

        if(cellx < 0) return null
        if(celly < 0) return null
        if(cellx >= worldWidth) return null
        if(celly >= worldLength) return null

        var x0 = Math.floor(cellx/chunksize) % seedsize
        var x1 = (x0 + 1) % seedsize
        var dx = cellx/chunksize - x0

        var y0 = Math.floor(celly/chunksize) % seedsize
        var y1 = (y0 + 1) % seedsize
        var dy = celly/chunksize - y0

        var f0 = this._cosineInterp(seed[y0][x0], seed[y0][x1], dx)
        var f1 = this._cosineInterp(seed[y1][x0], seed[y1][x1], dx)


        var fout = this._cosineInterp(f0.val, f1.val, dy)
        var xslope = this._cosineInterp(f0.slope, f1.slope, dy)

        var gradient  = Math.pow(xslope.val, 2)
            gradient += Math.pow(fout.slope, 2)
            gradient  = Math.sqrt(gradient)

        return {
            val: fout.val,
            grad: gradient
        }
    },
    'public setInspectionMode': function (mode) {
        this._inspect = mode;
    },
    /*
    Render the geometry in the scene.
    */
    'public renderWorld': function() {
        this._scene.render()
    },
    /*
    Set the entire state of the world to the new state.

    param state: The new state to replace the state of the world.
    */
    'public setWorldState': function (state) {
        this._worldState = WorldState(state)
    },
    /*
    Update the world with the changes specified by a list of state change
    operations.

    param deltas: List of state change operations.
    param backstep: If true then the operations will be applied backwards.
    */
    'public applyDeltas': function (deltas, backstep) {
        if (backstep) {
            for (delta in deltas) {

            }
        } else {
            for (delta in deltas) {

            }
        }

    },
    /*
    Return the cell information at the inputted grid position.

    param x: x coordinate of cell
    param y: y coordinate of cell

    out: Cell object at point (x,y)
    */
    'public getCell': function (x,y) {
        if(this._worldState.get("cells")[x + " " + y] != undefined)
            return this._worldState.get("cells")[x + " " + y]

        return this._terrainGen(x,y)
    },
    /*
    Update the chunks in the lru cache based on the position inputted.

    param x: x position of view.
    param y: y position of view.
    param force: Force update over already defined chunks in the view.
    */
    'public updateView': function(x,y) {
        if(this._worldState == null)
            return

        var chunksize = this._worldState.get("chunkSize")

        var chunk_x
        var chunk_y


        for(var i = -4; i <= 4; i++) {
            for(var  j = -4; j <= 4; j++) {
                chunk_x = Math.floor(x/chunksize) + j
                chunk_y = Math.floor(y/chunksize) + i

                chunk_x *= chunksize
                chunk_y *= chunksize

                this.updateChunk(chunk_x, chunk_y)
            }
        }
    },
    /*
    Update a single chunk into the lru cache by either looking up the chunk in the world state
    or otherwise generating it formulaically.

    param x: x position of chunk
    param y: y position of chunk
    param force: Force update the chunk even if it's already loaded.
    */
    'public updateChunk': function (x,y) {
        //Make sure to round key into chunk grid coordinates
        var chunksize = this._worldState.get("chunkSize")
        var chunk_x = Math.floor(x/chunksize)
        var chunk_y = Math.floor(y/chunksize)

        var cellx = chunk_x*chunksize
        var celly = chunk_y*chunksize

        var chunk
        var pcell, cell, mesh

        chunk = this._sceneChunks.get(chunk_x + " " + chunk_y)
        cachemiss = chunk == undefined
        if(cachemiss)
            chunk = []

        for (var i = 0; i < chunksize; i++) {
            var row
            if(cachemiss)
                row = []
            for (var j = 0; j < chunksize; j++) {
                if(!cachemiss) {
                    pcell = chunk[i][j]
                    for(k in pcell.contents)
                        pcell.contents[k]["mesh"].dispose()
                }

                cell = this._terrainGen(cellx, celly)

                //If new cell is different, rerender.
                if (cachemiss
                    || pcell["type"] != cell["type"]
                    || Math.floor(pcell["elevation"]*100)/100 != Math.floor(cell["elevation"]*100)/100)
                {
                    mesh = this._proto[cell["type"]]
                               .createInstance(cellx + " " + celly)

                    mesh.scaling.y = cell["elevation"]/2

                    mesh.position = new BABYLON.Vector3(cellx, cell["elevation"]/4, celly)

                    cell["mesh"] = mesh

                    if(cachemiss)
                        row.push(cell)
                    pcell = cell
                }
                else {
                    pcell.contents = cell.contents
                }

                for(k in pcell.contents) {
                    var cont = pcell.contents[k]
                    cont.mesh = this._proto[cont["type"]]
                                    .createInstance(cellx + " " + celly + " " + cont["type"])
                    cont.mesh.position = new BABYLON.Vector3(cellx, pcell["elevation"]/2, celly)
                    cont.mesh.isPickable = false;
                }
                cellx++
            }
            if(cachemiss)
                chunk.push(row)
            cellx = chunk_x*chunksize
            celly++
        }
        if(cachemiss)
            this._sceneChunks.set(chunk_x + " " + chunk_y, chunk)
    }
})

},{"./primitives/world-cell":37,"./primitives/world-state":38,"easejs":1,"lru-cache":27}]},{},[34]);
