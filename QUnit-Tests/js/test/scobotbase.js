/*global SCOBotUtil, SCOBotBase, QUnit, ok, module, test, strictEqual, equal, SCOBotBase, debug, learner_name, learner_id, mode */
/*
 * This is purely the core communication API to the LMS.  More of a classic 'wrapper' for the SCORM API the content
 * can use to talk to the LMS.  Please see SCOBot for more full tests, or feel free to expand the ones below.
 */
QUnit.config.reorder = false;

module("SCOBotBase");
var $              = SCOBotUtil,
    local          = false,
    version        = '',
    canContinue    = '',
    setvalue_calls = 0,
    getvalue_calls = 0,
    scorm = new SCOBotBase({
        debug:        true,
        throw_alerts: true
    });
// Some Events fired from SCOBotBase
// 'on()' is available as of 1.7 JQuery instead of bind()
$.addEvent(scorm, "setvalue", function (e) {
    "use strict";
    setvalue_calls += 1;
});
$.addEvent(scorm, "getvalue", function (e) {
    "use strict";
    getvalue_calls += 1;
});

// END
// Debug
test("scorm.debug", function () {
    "use strict";
    var sub_method = scorm.debug;
    ok(sub_method("Error Message", 1), "Valid error message");
    ok(sub_method("Warning Message", 2), "Valid warning message");
    ok(sub_method("General Message", 3), "Valid general message");
    ok(sub_method("Log Message", 4), "Valid log message");
    ok(!sub_method("Bogus Message", 5), "Invalid log message");
});
// Initialize
test("initialize", function () {
    "use strict";
    ok(scorm.initialize(), "initialize");
    version = scorm.getvalue('cmi._version');
    local = version === "Local 1.0";
    /**
     * Verify LMS Connected
     */
    test("LMS Connected", function () {
        if (local) {
            strictEqual(scorm.isLMSConnected(), false, 'Local enabled, should not find a LMS.');
        } else {
            strictEqual(scorm.isLMSConnected(), true, 'Local disabled, should find a LMS.');
        }
    });
    // Internal SCOBotBase get/set tests (not setvalue, getvalue)
    // Get
    test("get", function () {
        if (local) {
            ok(scorm.get('standalone'), "Standalone checkup - " + scorm.get('standalone'));
        } else {
            ok(!scorm.get('standalone'), "Standalone checkup - " + scorm.get('standalone'));
        }
        ok(scorm.get('version'), "Get Version: " + scorm.get('version'));
    });
    // Set
    test("set", function () {
        ok(!scorm.set('version', '2.0'), "Cannot set version, read-only: " + scorm.get('version'));
        // This is not allowed validate
    });
    // This is empty during non-LMS but could be populated if ran on a LMS
    // GetValue
    test("getvalue", function () {
        var getvalue = scorm.getvalue;
        strictEqual(getvalue('cmi.mode'), 'normal', "Requested cmi.mode - " + getvalue('cmi.mode'));
        strictEqual(getvalue('cmi.session_time'), 'false', "Requested cmi.session_time - (not allowed, will throw error 405)");
        if (local) {
            // First time this will be blank / null, since this is isLocal your pretty much always in the "first time" category
            strictEqual(getvalue('cmi.launch_data'), '?name=value1&name2=value2&name3=value3', "Requested cmi.launch_data - " + getvalue('cmi.launch_data'));
            strictEqual(getvalue('cmi.entry'), 'ab-initio', "Requested cmi.entry - " + getvalue('cmi.entry'));
            strictEqual(getvalue('cmi.credit'), 'no-credit', "Requested cmi.credit - " + getvalue('cmi.credit'));
            strictEqual(getvalue('cmi.location'), "", "Getting cmi.location - " + getvalue('cmi.location') + "(this should be empty)");
            // this may need to be "false"
            strictEqual(getvalue('cmi.completion_status'), "incomplete", "Getting cmi.completion_status - " + getvalue('cmi.completion_status'));
            strictEqual(getvalue('cmi.suspend_data'), "", "Getting cmi.suspend_data");
            strictEqual(getvalue('cmi.success_status'), "unknown", "Getting cmi.success_status");
            strictEqual(getvalue('cmi.learner_name'), learner_name, "Getting cmi.learner_name");
            strictEqual(getvalue('cmi.learner_id'), learner_id, "Getting cmi.learner_id");
        } else {
            strictEqual(getvalue('cmi.launch_data'), 'name=value', "Requested cmi.launch_data - " + getvalue('cmi.launch_data'));
            if (getvalue('cmi.location') === "") {// SCOBotBase should ensure we get empty values when things are null, undefined or any combo there-in.
                // First time
                strictEqual(getvalue('cmi.location'), "", "Getting cmi.location - " + getvalue('cmi.location') + "(this should be empty)");
                // this may need to be "false"
                strictEqual(getvalue('cmi.success_status'), "unknown", "Getting cmi.success_status");
                strictEqual(getvalue('cmi.suspend_data'), "", "Getting cmi.suspend_data (should be empty)");
                strictEqual(getvalue('cmi.completion_status'), "unknown", "Getting cmi.completion_status - " + getvalue('cmi.completion_status'));
            } else {
                // Been here before (bookmarking was set to '4' prior), if you changed that please update this test.
                strictEqual(getvalue('cmi.location'), "4", "Getting cmi.location - " + getvalue('cmi.location') + " (this should be 4)");
                // this may need to be "false"
                strictEqual(getvalue('cmi.success_status'), "passed", "Getting cmi.success_status - " + getvalue('cmi.success_status') + " (this should be passed)");
                // this may need to be "false"
                strictEqual(getvalue('cmi.suspend_data'), "{\"name\":\"value\"}", "Getting cmi.suspend_data from prior session");
                strictEqual(getvalue('cmi.completion_status'), "completed", "Getting cmi.completion_status - " + getvalue('cmi.completion_status'));
            }
            /** REMEMBER: If you change a test, go back and change conditions for its retrieval **/

            // Some LMS's return Data Not Initialized when calling cmi.suspend_data.  This results in some mixed responses (null, "", undefined, 'false')
            // Tester, if you have problems with name or ID, you can comment these out, or update them in the qunit.html file.  See learner name and learner id.
            //strictEqual(getvalue('cmi.learner_name'), learner_name, "Getting cmi.learner_name");
            //strictEqual(getvalue('cmi.learner_id'), learner_id, "Getting cmi.learner_id");
        }

        // Need to set some values within the CMI object ** TEST 1 ()
        // SetValue
        test("setvalue", function () {
            var setvalue = scorm.setvalue,
                getvalue = scorm.getvalue,
                interactionIndex = getvalue('cmi.interactions._count'),
                objectiveIndex = getvalue('cmi.objectives._count'),
                interactionObjectiveIndex = '0', //scorm.getInteractionObjectiveByID(interactionIndex, '0_1_1'),
                interactionResponses = '0';

            // things get screwy here.  interactionIndex is most likely '0'.  So you shouldn't be looking up a interaction Objective Index

            scorm.debug(">>>>>>>>>>>> start set value test <<<<<<<<<<<<<<<<<<<", 4);
            strictEqual(setvalue('cmi.mode', 'browse'), 'false', "Setting cmi.mode (not allowed, will throw error 404)"); // This is not allowed validate
            ok(setvalue('cmi.location', '4'), "Setting cmi.location to 4");
            strictEqual(setvalue('cmi.completion_status', "total failure"), 'false', "Setting cmi.completion_status to total failure (not allowed, will throw error 406)");// This is not allowed validate
            ok(setvalue('cmi.completion_status', "incomplete"), "Setting cmi.completion_status to incomplete");
            ok(setvalue('cmi.success_status', "passed"), "Setting cmi.success_status to passed");
            ok(setvalue('cmi.score.min', '0'), "Setting cmi.score.min to 0");
            ok(setvalue('cmi.score.max', '1'), "Setting cmi.score.max to 1");
            // This is not allowed validate
            if (local) { // isLocal
                //[BLOCK1]
                // New Objective
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.id', '0_1_1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.id');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.scaled', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.scaled');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.min', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.min');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.max', '1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.max');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.raw', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.raw');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.success_status', 'unknown'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.success_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.completion_status', 'incomplete'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.completion_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.progress_measure', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.progress_measure');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.description', 'I get 250 characters to describe this object.'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.description');

                // Stress interactions object
                strictEqual(interactionIndex, "0", "Getting cmi.interactions._count - " + interactionIndex + " (this should be 0)");
                // Some Interaction based * 0 would be the index per question
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.id', '0_1'), 'true', 'Setting cmi.interation.' + interactionIndex + '.id');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.type', 'true-false'), 'true', 'Setting cmi.interation.' + interactionIndex + '.type');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.objectives.' + interactionObjectiveIndex + '.id', '0_1_1'), 'true', 'Setting cmi.interactions.' + interactionIndex + '.objectives.' + interactionObjectiveIndex + '.id');
                // Pattern is sticky, new count.
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.correct_responses.' + interactionResponses + '.pattern', 'true'), 'true', 'Setting cmi.interation.' + interactionIndex + '.correct_responses.' + interactionResponses + '.pattern');

                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.description', 'Response item presentation order: 0,1'), 'true', 'Setting cmi.interation.' + interactionIndex + '.description');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.learner_response', 'false'), 'true', 'Setting cmi.interation.' + interactionIndex + '.learner_response');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.result', 'incorrect'), 'true', 'Setting cmi.interation.' + interactionIndex + '.result');
                // END [BLOCK1]

                //[BLOCK 2]
                // Objectives are unique, you can't just add another objective with the same ID, it will result in a 351 error.  Lets make sure the LMS responds accordingly
                objectiveIndex = getvalue('cmi.objectives._count'); // you must keep your index up
                // Update (incorrect) Objective
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.id', '0_1_1'), 'false', 'Setting cmi.objectives.' + objectiveIndex + '.id');

                objectiveIndex = scorm.getObjectiveByID('0_1_1'); // Doing it right now
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.scaled', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.scaled');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.min', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.min');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.max', '1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.max');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.raw', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.raw');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.success_status', 'failed'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.success_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.completion_status', 'incomplete'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.completion_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.progress_measure', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.progress_measure');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.description', 'I get 250 characters to describe this object.'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.description');


                interactionIndex = getvalue('cmi.interactions._count'); // you must keep your index up

                // Some Interaction based * 0 would be the index per question
                ok(setvalue('cmi.interactions.' + interactionIndex + '.id', '0_1'), 'Setting cmi.interation.' + interactionIndex + '.id');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.type', 'true-false'), 'Setting cmi.interation.' + interactionIndex + '.type');
                // Interesting issue, the next object doesn't exist yet, 'false' would be returned.
                interactionObjectiveIndex = getvalue('cmi.interactions.' + interactionIndex + '.objectives._count') ? 'false' : '0';
                strictEqual(interactionIndex, "1", "Getting cmi.interactions._count - " + interactionIndex + " (this should be 1)");
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.objectives.' + interactionObjectiveIndex + '.id', '0_1_1'), 'true', 'Setting cmi.interactions.' + interactionIndex + '.objectives.' + interactionObjectiveIndex + '.id');
                // Pattern is sticky, new count
                ok(setvalue('cmi.interactions.' + interactionIndex + '.correct_responses.' + interactionResponses + '.pattern', 'true'), 'Setting cmi.interation.' + interactionIndex + '.correct_responses.' + interactionResponses + '.pattern');

                ok(setvalue('cmi.interactions.' + interactionIndex + '.description', 'Response item presentation order: 0,1'), 'Setting cmi.interation.' + interactionIndex + '.description');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.learner_response', 'false'), 'Setting cmi.interation.' + interactionIndex + '.learner_response');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.result', 'incorrect'), 'true', 'Setting cmi.interation.' + interactionIndex + '.result');
                // END [BLOCK2]

                // [BLOCK3]
                // Point of interest, you'd technically need to use the cmi.interactions.n.objectives._count
                objectiveIndex = scorm.getObjectiveByID('0_1_1'); // you must keep your index up
                // Correctly Set Objective
                //strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.id', '0_1_1'), true, 'Setting cmi.objectives.' + objectiveIndex + '.id');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.scaled', '1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.scaled');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.min', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.min');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.max', '1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.max');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.raw', '1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.raw');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.success_status', 'passed'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.success_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.completion_status', 'completed'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.completion_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.progress_measure', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.progress_measure');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.description', 'I get 250 characters to describe this object.'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.description');

                // Correctly Set Interaction
                interactionIndex = getvalue('cmi.interactions._count'); // you must keep your index up
                // Some Interaction based * 0 would be the index per question
                ok(setvalue('cmi.interactions.' + interactionIndex + '.id', '0_1'), 'Setting cmi.interation.' + interactionIndex + '.id');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.type', 'true-false'), 'Setting cmi.interation.' + interactionIndex + '.type');
                // Interesting issue, the next object doesn't exist yet, 'false' would be returned.
                interactionObjectiveIndex = getvalue('cmi.interactions.' + interactionIndex + '.objectives._count') ? 'false' : '0';
                strictEqual(interactionIndex, "2", "Getting cmi.interactions._count - " + interactionIndex + " (this should be 2)");
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.objectives.' + interactionObjectiveIndex + '.id', '0_1_1'), 'true', 'Setting cmi.interactions.' + interactionIndex + '.objectives.' + interactionObjectiveIndex + '.id');
                // Pattern is sticky, new count
                ok(setvalue('cmi.interactions.' + interactionIndex + '.correct_responses.' + interactionResponses + '.pattern', 'true'), 'Setting cmi.interation.' + interactionIndex + '.correct_responses.' + interactionResponses + '.pattern');

                ok(setvalue('cmi.interactions.' + interactionIndex + '.description', 'Response item presentation order: 0,1'), 'Setting cmi.interation.' + interactionIndex + '.description');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.learner_response', 'true'), 'Setting cmi.interation.' + interactionIndex + '.learner_response');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.result', 'correct'), 'true', 'Setting cmi.interation.' + interactionIndex + '.result');
                // END [BLOCK3]
                // DEVELOPER: YOU ARE EXPECTING 2 below!!! see: strictEqual(interactionIndex, 2, "Getting Objective by ID 0_1");  Please change this if you alter the test.

            } else { // LMS
                // On the server we don't have the benefit of knowing how many interactions are already in queue so to get through the test I'm expecting it all to self rely here
                // Stress interactions object
                objectiveIndex = scorm.getObjectiveByID('0_1_1'); // you must keep your index up
                // New Objective
                if (objectiveIndex === 'false') { // its new (you may be coming from a prior session)
                    objectiveIndex = '0';
                    strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.id', '0_1_1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.id');
                    //objectiveIndex = scorm.getObjectiveByID('0_1_1'); // you must keep your index up
                }

                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.scaled', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.scaled');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.min', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.min');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.max', '1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.max');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.raw', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.raw');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.success_status', 'unknown'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.success_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.completion_status', 'incomplete'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.completion_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.progress_measure', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.progress_measure');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.description', 'I get 250 characters to describe this object.'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.description');

                // [BLOCK1]
                strictEqual(interactionIndex, interactionIndex, "Getting cmi.interactions._count - " + interactionIndex + " (this should be " + interactionIndex + ")");
                // Some Interaction based * 0 would be the index per question
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.id', '0_1'), 'true', 'Setting cmi.interation.' + interactionIndex + '.id');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.type', 'true-false'), 'true', 'Setting cmi.interation.' + interactionIndex + '.type');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.objectives.' + objectiveIndex + '.id', '0_1_1'), 'true', 'Setting cmi.interactions.' + interactionIndex + '.objectives.' + interactionObjectiveIndex + '.id');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.correct_responses.' + interactionIndex + '.pattern', 'true'), 'true', 'Setting cmi.interation.' + interactionIndex + '.correct_responses.' + interactionIndex + '.pattern');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.description', 'Response item presentation order: 0,1'), 'true', 'Setting cmi.interation.' + interactionIndex + '.description');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.learner_response', 'false'), 'true', 'Setting cmi.interation.' + interactionIndex + '.learner_response');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.result', 'incorrect'), 'true', 'Setting cmi.interation.' + interactionIndex + '.result');
                //[BLOCK1]

                //[BLOCK2]
                objectiveIndex = getvalue('cmi.objectives._count'); // you must keep your index up
                // Update (incorrect) Objective
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.id', '0_1_1'), 'false', 'Setting cmi.objectives.' + objectiveIndex + '.id');

                objectiveIndex = scorm.getObjectiveByID('0_1_1'); // you must keep your index up
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.scaled', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.scaled');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.min', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.min');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.max', '1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.max');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.raw', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.raw');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.success_status', 'failed'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.success_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.completion_status', 'incomplete'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.completion_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.progress_measure', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.progress_measure');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.description', 'I get 250 characters to describe this object.'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.description');

                interactionIndex = getvalue('cmi.interactions._count');
                strictEqual(interactionIndex, interactionIndex, "Getting cmi.interactions._count - " + interactionIndex + " (this should be " + interactionIndex + ")");
                // Some Interaction based * 0 would be the index per question
                ok(setvalue('cmi.interactions.' + interactionIndex + '.id', '0_1'), 'Setting cmi.interation.' + interactionIndex + '.id');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.type', 'true-false'), 'Setting cmi.interation.' + interactionIndex + '.type');
                // Interesting issue, the next object doesn't exist yet, 'false' would be returned.
                interactionObjectiveIndex = getvalue('cmi.interactions.' + interactionIndex + '.objectives._count') ? 'false' : '0';
                if (interactionObjectiveIndex === "false") {
                    interactionObjectiveIndex = '0';
                }
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.objectives.' + interactionObjectiveIndex + '.id', '0_1_1'), 'true', 'Setting cmi.interactions.' + interactionIndex + '.objectives.' + interactionObjectiveIndex + '.id');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.correct_responses.' + interactionIndex + '.pattern', 'true'), 'Setting cmi.interation.' + interactionIndex + '.correct_responses.' + interactionIndex + '.pattern');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.description', 'Response item presentation order: 0,1'), 'Setting cmi.interation.' + interactionIndex + '.description');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.learner_response', 'false'), 'Setting cmi.interation.' + interactionIndex + '.learner_response');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.result', 'incorrect'), 'true', 'Setting cmi.interation.' + interactionIndex + '.result');
                // END [BLOCK2]

                // [BLOCK3]
                // Point of interest, you'd technically need to use the cmi.interactions.n.objectives._count
                objectiveIndex = scorm.getObjectiveByID('0_1_1'); // you must keep your index up
                // Correctly Set Objective
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.scaled', '1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.scaled');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.min', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.min');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.max', '1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.max');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.score.raw', '1'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.score.raw');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.success_status', 'passed'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.success_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.completion_status', 'completed'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.completion_status');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.progress_measure', '0'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.progress_measure');
                strictEqual(setvalue('cmi.objectives.' + objectiveIndex + '.description', 'I get 250 characters to describe this object.'), 'true', 'Setting cmi.objectives.' + objectiveIndex + '.description');


                interactionIndex = getvalue('cmi.interactions._count');
                strictEqual(interactionIndex, interactionIndex, "Getting cmi.interactions._count - " + interactionIndex + " (this should be " + interactionIndex + ")");
                // Some Interaction based * 0 would be the index per question
                ok(setvalue('cmi.interactions.' + interactionIndex + '.id', '0_1'), 'Setting cmi.interation.' + interactionIndex + '.id');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.type', 'true-false'), 'Setting cmi.interation.' + interactionIndex + '.type');
                // Interesting issue, the next object doesn't exist yet, 'false' would be returned.
                interactionObjectiveIndex = getvalue('cmi.interactions.' + interactionIndex + '.objectives._count') ? 'false' : '0';
                if (interactionObjectiveIndex === "false") {
                    interactionObjectiveIndex = '0';
                }
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.objectives.' + interactionObjectiveIndex + '.id', '0_1_1'), 'true', 'Setting cmi.interactions.' + interactionIndex + '.objectives.' + interactionObjectiveIndex + '.id');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.correct_responses.' + interactionIndex + '.pattern', 'true'), 'Setting cmi.interation.' + interactionIndex + '.correct_responses.' + interactionIndex + '.pattern');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.description', 'Response item presentation order: 0,1'), 'Setting cmi.interation.' + interactionIndex + '.description');
                ok(setvalue('cmi.interactions.' + interactionIndex + '.learner_response', 'true'), 'Setting cmi.interation.' + interactionIndex + '.learner_response');
                strictEqual(setvalue('cmi.interactions.' + interactionIndex + '.result', 'correct'), 'true', 'Setting cmi.interation.' + interactionIndex + '.result');
                // END [BLOCK3]
            }

            // Suspend
            strictEqual(setvalue('cmi.suspend_data', "{\"name\":\"value\"}"), 'true', "Setting cmi.suspend_data");
            scorm.debug(">>>>>>>>>>>> end set value test <<<<<<<<<<<<<<<<", 4);
            // Need to check to see if results have been updated
            // GetValue
            test("getvalue", function () {
                var getvalue = scorm.getvalue;
                interactionIndex = scorm.getInteractionByID("0_1");
                scorm.debug(">>>>>>>>>>>> start get value test <<<<<<<<<<<<<<<<<<<", 4);
                strictEqual(getvalue('cmi.mode'), 'normal', "Requested cmi.mode - " + getvalue('cmi.mode'));
                strictEqual(getvalue('cmi.location'), "4", 'Getting cmi.location - ' + getvalue('cmi.location') + ' (this should be 4)');
                if (local) {
                    strictEqual(interactionIndex, 2, "Getting Objective by ID 0_1");
                } else {
                    strictEqual(interactionIndex, interactionIndex, "Getting Objective by ID 0_1");
                }
                // this may need to be "false"
                strictEqual(getvalue('cmi.interactions.' + interactionIndex + '.learner_response'), 'true', 'Getting cmi.interactions.' + interactionIndex + '.learner_response - ' + getvalue('cmi.interactions.' + interactionIndex + '.learner_response') + ' (this should be true)');
                strictEqual(getvalue('cmi.interactions.' + interactionIndex + '.result'), 'correct', 'Getting cmi.interactions.' + interactionIndex + '.result - ' + getvalue('cmi.interactions.' + interactionIndex + '.result') + ' (this should be correct)');
                strictEqual(getvalue('cmi.interactions.' + interactionIndex + '.type'), 'true-false', 'Getting cmi.interactions.' + interactionIndex + '.type - ' + getvalue('cmi.interactions.' + interactionIndex + '.type') + ' (this should be true-false)');

                if (local) {
                    strictEqual(getvalue('cmi.interactions._count'), '3', "Getting Objective Count, expecting 3");
                } else {
                    strictEqual(getvalue('cmi.interactions._count'), getvalue('cmi.interactions._count'), "Getting Objective Count, expecting " + getvalue('cmi.interactions._count'));
                }

                test("ISO Duration", function() {
                    // Adding test to make sure ISODurationToCentisecs works properly.
                    var time = scorm.ISODurationToCentisec("PT10S") * 10;
                    strictEqual(time, 10000, "Checking ISODurationToCentisecs");
                });

                // Wrap up scoring
                test("setvalue", function () {
                    strictEqual(setvalue('cmi.score.raw', "1"), 'true', 'Setting cmi.score.raw to 1');
                    strictEqual(setvalue('cmi.score.scaled', "1"), 'true', 'Setting cmi.score.scaled to 1');
                    strictEqual(setvalue('cmi.completion_status', 'completed'), 'true', 'Setting cmi.completion_status to completed');
                    strictEqual(setvalue('cmi.success_status', 'passed'), 'true', 'Setting cmi.success_status to passed');
                });
                // Commit
                test("commit", function () {
                    strictEqual(scorm.commit(), 'true', "Commit data (should respond true)");
                    // Test to see if adl.nav.request_valid.continue functions
                    canContinue = scorm.getvalue('adl.nav.request_valid.continue');

                    if (canContinue === 'true' || canContinue === 'unknown') {
                        scorm.setvalue('adl.nav.request', 'continue');  // Enable this if you want it to cruise thru the whole lesson
                        // Commit will be called on terminate!!
                    }
                    //strictEqual(canContinue, 'true', 'Checking for adl.nav.request_valid.continue');
                });
                // Terminate
                test("terminate", function () {

                    strictEqual(scorm.setvalue('cmi.exit', 'normal'), 'true', "Setting Exit type normal");
                    strictEqual(scorm.terminate(), 'true', "Termination (you can't do anything else after this technically)");

                    // Make some Illegal SCORM Calls after Termination should successfully fail ;)
                    test("Illegal calls after Termination", function () {
                        var setvalue = scorm.setvalue;
                        scorm.debug("QUnit making illegal API calls, don't be alarmed.");
                        strictEqual(setvalue('cmi.location', '5'), 'false', "Setting cmi.location after termination (not allowed)");
                        strictEqual(setvalue('cmi.suspend_data', '{\"something\":\"value\"}'), 'false', "Setting cmi.suspend_data after termination (not allowed)");
                        //scorm.debug("Total Set Calls: " + setvalue_calls, 4); // END
                        //scorm.debug("Total Get Calls: " + getvalue_calls, 4); // END
                    });
                });
            });
        });
    });
});
