package main

import "testing"

func TestInitEmptyRaids(t *testing.T) {
	if nRaids := len(raidDb.data); nRaids != 0 {
		t.Errorf("Expected zero raids to begin, got %d", nRaids)
	}
}

func TestRegister(t *testing.T) {
	if _, err := raidDb.members("testChannel", "testName"); err == nil {
		t.Error("Expected unregistered raid to throw an error when listing members")
	}

	if err := raidDb.register("testChannel", "testName", "testUser"); err != nil {
		t.Errorf("Expected nil error when registering a raid, got %s", err.Error())
	}
	wantError := "A raid by this name is already registered"
	if err := raidDb.register("testChannel", "testName", "testUser"); err != nil {
		if err.Error() != wantError {
			t.Errorf(
				"Expected '%s' error when registering a duplicate raid, got %s",
				wantError,
				err.Error(),
			)
		}
	} else {
		t.Errorf(
			"Expected '%s' error when registering a duplicate raid",
			wantError,
		)
	}

	if members, err := raidDb.members("testChannel", "testName"); err == nil {
		if len(members) != 1 {
			t.Errorf("Expected 1 member in newly registered raid, got %d", len(members))
		}
	} else {
		t.Errorf(
			"Expected nil error when listing members of newly registered raid. Got: %s",
			err.Error(),
		)
	}
}

func TestJoinAlt(t *testing.T) {
	if _, err := raidDb.joinAlt("noChannel", "testName", "userTwo"); err == nil {
		t.Error("Expected error joining raid on channel with no raids")
	}
	if _, err := raidDb.joinAlt("testChannel", "testWrongName", "userTwo"); err == nil {
		t.Error("Expected error joining raid on wrong raid name")
	}
	for i := 1; i < 4; i++ {
		if repl, err := raidDb.joinAlt("testChannel", "testName", "userTwo"); err != nil {
			t.Errorf(
				"Expected nil error joining raid as alt #%d, got: %s",
				i,
				err.Error(),
			)
		} else {
			// This function returns the leader of that raid so that we can message them
			// without another lookup.
			if repl != raidDb.data["testChannel"][0].Members[0] {
				t.Errorf("Got wrong reply when joining as alt #%d: %s", i, repl)
			}
			if len(raidDb.data["testChannel"][0].Alts) < i {
				t.Errorf(
					"Expected %d alts after joining as an alt %d times, got %d",
					i,
					i,
					len(raidDb.data["testChannel"][0].Alts),
				)
			} else {
				if raidDb.data["testChannel"][0].Alts[(i-1)] != "userTwo" {
					t.Errorf(
						`Expected raidDb.data["testChannel"][0].Alts[%d] to be registered user, `+
							`got: %s`,
						(i + 1),
						raidDb.data["testChannel"][0].Alts[(i-1)],
					)
				}
			}
		}
	}
}

func TestJoin(t *testing.T) {
	if _, err := raidDb.join("noChannel", "testName", "userThree"); err == nil {
		t.Error("Expected error joining raid on channel with no raids")
	}
	if _, err := raidDb.join("testChannel", "testWrongName", "userThree"); err == nil {
		t.Error("Expected error joining raid on wrong raid name")
	}
	for i := 1; i < 4; i++ {
		if repl, err := raidDb.join("testChannel", "testName", "userThree"); err != nil {
			t.Errorf(
				"Expected nil error joining raid #%d, got: %s",
				i,
				err.Error(),
			)
		} else {
			// This function returns the leader of that raid so that we can message them
			// without another lookup.
			if repl != raidDb.data["testChannel"][0].Members[0] {
				t.Errorf("Got wrong reply when joining #%d: %s", i, repl)
			}
			if len(raidDb.data["testChannel"][0].Members) < (i + 1) {
				t.Errorf(
					"Expected at least %d members on raid after joining for %d time, got: %d",
					(i + 1),
					i,
					len(raidDb.data["testChannel"][0].Members),
				)
			} else {
				if raidDb.data["testChannel"][0].Members[i] != "userThree" {
					t.Error(
						`Expected raidDb.data["testChannel"][0].Members[i] to be the correct `+
							`user, got: %s`,
						raidDb.data["testChannel"][0].Members[i],
					)
				}
			}
		}
	}
}

func TestLeaveAlt(t *testing.T) {
	if _, err := raidDb.leaveAlt("testChannel", "testName", "notAnAlt"); err == nil {
		t.Error("Expected error alt-leaving a raid which I am not an alt for, got nil")
	}
	if _, err := raidDb.leaveAlt("testChannel", "testWrongName", "userTwo"); err == nil {
		t.Error("Expected error alt-leaving a raid which does not exist, got nil")
	}
	if _, err := raidDb.leaveAlt("testWrongChannel", "testName", "userTwo"); err == nil {
		t.Error("Expected error alt-leaving a raid on a channel which does not exist, got nil")
	}
	if repl, err := raidDb.leaveAlt("testChannel", "testName", "userTwo"); err != nil {
		t.Errorf(
			"Expected nil error alt-leaving a raid, got: %s",
			err.Error(),
		)
	} else {
		if repl != raidDb.data["testChannel"][0].Members[0] {
			t.Errorf(
				"Expected leader of raid as return reply for alt-leaving, got: %s",
				repl,
			)
		}
		if l := len(raidDb.data["testChannel"][0].Alts); l != 2 {
			t.Errorf(
				"Expected 2 alts after leaving 3rd spot, got: %d",
				l,
			)
		}
	}
}

func TestLeave(t *testing.T) {
	if _, err := raidDb.leave("testChannel", "testName", "notAnMember"); err == nil {
		t.Error("Expected error leaving a raid which I am not an alt for, got nil")
	}
	if _, err := raidDb.leave("testChannel", "testWrongName", "userThree"); err == nil {
		t.Error("Expected error leaving a raid which does not exist, got nil")
	}
	if _, err := raidDb.leave("testWrongChannel", "testName", "userThree"); err == nil {
		t.Error("Expected error leaving a raid on a channel which does not exist, got nil")
	}
	if repl, err := raidDb.leave("testChannel", "testName", "userThree"); err != nil {
		t.Errorf(
			"Expected nil error leaving a raid, got: %s",
			err.Error(),
		)
	} else {
		if repl != raidDb.data["testChannel"][0].Members[0] {
			t.Errorf(
				"Expected leader of raid as return reply for alt-leaving, got: %s",
				repl,
			)
		}
		if l := len(raidDb.data["testChannel"][0].Members); l != 3 {
			t.Errorf(
				"Expected 3 alts after leaving 4th spot, got: %d",
				l,
			)
		}
	}
}

func TestFinish(t *testing.T) {
	if err := raidDb.finish("testChannel", "testName", "testWrongUser"); err == nil {
		t.Error("Expected error finishing raid as wrong user")
	}
	if err := raidDb.finish("testChannel", "testWrongName", "testUser"); err == nil {
		t.Error("Expected error finishing wrong raid name")
	}
	if err := raidDb.finish("testWrongChannel", "testName", "testUser"); err == nil {
		t.Error("Expected error finishing raid on wrong channel")
	}
	if err := raidDb.finish("testChannel", "testName", "testUser"); err != nil {
		t.Errorf("Expected nil error finishing raid, got: %s", err.Error())
	}
	// TODO: Test admin functionality
}

func TestExpire(t *testing.T) {
	// TODO
}
