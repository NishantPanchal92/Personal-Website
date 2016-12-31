# Import file "ipad_sketch_Nishant"
sketch = Framer.Importer.load("imported/ipad_sketch_Nishant@1x")

## Global Properties
curve1 = "spring(300,20,10)"
accept = 0

## Hide all layers to start with
sketch.Splash.visible = sketch.Consent_form.visible = sketch.Reason_for_visit.visible = sketch.Select_Character.visible = sketch.Select_Gender.visible = sketch.Select_Age.visible = sketch.Instructions.visible = sketch.QRScan.visible = sketch.Story.visible = sketch.Feedback.visible = sketch.Smiley.visible = false

## FUNCTION for button animation
animateButton = (layer, scaleAmount, curveParam) ->
	layer.animate
		scale: scaleAmount
		options:
			curve: curveParam

## FUNCTION to setup animation for TouchStart and TouchMove for buttons
## 1- include 0-exclude
touchButtons = (layer, i) ->
	layer.on Events.TouchStart, ->
		animateButton(layer, 0.8, curve1)
	layer.on Events.TouchMove, ->
		animateButton(layer, 1, curve1)
	if i == 1
		layer.on Events.TouchEnd, ->
			animateButton(layer, 1, curve1)

## FUNCTION to add exit state to the layer
exitStateAdd = (layer) ->
	layer.states.add
		exit:
			opacity: 0
			x: 0-screen.width
			options:
				time: 0.5

## FUNCTION to navigate to next page with animation
moveNext = (button, currentScreen, nextScreen) ->
	button.on Events.TouchEnd, ->
		animateButton(button, 1, curve1)
		## Detect animation end and present next screen with animation
		button.on Events.AnimationEnd, ->
			currentScreen.animate("exit")
			nextScreen.x = 0
			nextScreen.y = 0
			nextScreen.scale = 0.8
			nextScreen.opacity = 0.5
			nextScreen.visible = true
			## Detect Character screen animation and then show all other elements
			nextScreen.animate
				opacity: 1
				scale: 1
				options:
					time: 0.5
					curve: curve1

# Layer preview for selected character
preview_layer_char = new Layer
	visible: false

## FUNCTION to animate the character preview
animatePreview = (x, y) ->
	preview_layer_char.x = x
	preview_layer_char.y = y
	preview_layer_char.visible = true
	preview_layer_char.opacity = 0.8
	preview_layer_char.scale = 0.5
	preview_layer_char.animate
		opacity: 1.00
		scale: 1.00
		options:
			curve: "spring(500, 20, 40)"

## FUNCTION for onload animations
onLoadAnimation = (layer) ->
	for album, i in layer.children
			album.opacity = 0.8
			album.scale = 0.5
			album.animate
				opacity: 1.00
				scale: 1.00
				options:
					delay: 0.05 * i
					curve: "spring(500, 20, 40)"


#############################
## Animation of Splash Screen
#############################

Utils.delay 2
sketch.Splash.visible = true
sketch.Splash.opacity= 0.5
sketch.Splash.scale= 0.8
sketch.Splash.states.add
	final:
		opacity: 1
		scale: 1
		options:
			time: 1
			curve: curve1
	exit:
		opacity: 0
		x: 0-screen.width
		options:
			time: 0.5
			delay: 1

toggle = (x) ->
	if x == 0
		return 1
	if x == 1
		return 0
tog = 0
sketch.Splash.animate("final")
sketch.Splash.on Events.AnimationStop, ->
	tog = toggle(tog)
	if tog == 1
		sketch.Splash.animate("exit")
	if tog == 0
		sketch.Consent_form.x = 0
		sketch.Consent_form.y = 0
		sketch.Consent_form.scale = 0.8
		sketch.Consent_form.opacity = 0.5
		sketch.Consent_form.visible = true
		sketch.Consent_form.animate
			opacity: 1
			scale: 1
			options:
				time: 0.5
				curve: curve1

##########################
## Consent Form Screen
##########################

# scroll = new ScrollComponent
# 	parent: sketch.TandC
# 	x: 91
# 	y: 299
# 	width: 1164
# 	height: 972

##Animations for Decline Buttong
touchButtons(sketch.declineButton,1)

## Detect Touch on Decline button and present confirmation screen
sketch.declineButton.on Events.AnimationEnd, ->
	sketch.Popup.opacity = 0
	sketch.Popup.visible = true
	sketch.Popup.animate
		opacity: 1
		options: 
			time: 0.5

## Animations for 'OK' button
touchButtons(sketch.continueButton,1)

## Detect Touch on 'OK' button anc continue
sketch.continueButton.on Events.AnimationEnd, ->
	sketch.Popup.visible = false

## Animations for Accept Button
touchButtons(sketch.acceptButton,0)

## Add exit state for Consent Form
exitStateAdd(sketch.Consent_form)

## Detect Click on Accept Button and animate it
moveNext(sketch.acceptButton, sketch.Consent_form, sketch.Reason_for_visit)

###############################
## Reason for Treatment Screen
###############################

# Function to place selected overlay for Treatment options
onTreatSelect = (layer) ->
	sketch.selectTreatment.x = layer.x + 10
	sketch.selectTreatment.y = layer.y
	sketch.selectTreatment.visible = true
	sketch.selectNotSure.visible = false

# Function to place selected overlay for App used options
onAppSelect = (layer) ->
	sketch.selectAppUsed.x = layer.x + 8
	sketch.selectAppUsed.y = layer.y
	sketch.selectAppUsed.visible = true

# Function to place selected overlay for Not Sure options
onNotSureSelect = (layer) ->
	sketch.selectNotSure.x = layer.x + 10
	sketch.selectNotSure.y = layer.y
	sketch.selectNotSure.visible = true
	sketch.selectTreatment.visible = false

## Detect touch on all buttons
touchButtons(sketch.hemaButton,0)
touchButtons(sketch.oncoButton,0)
touchButtons(sketch.nextButtonTreat,0)
touchButtons(sketch.notsureButton,0)
touchButtons(sketch.yesButton,0)
touchButtons(sketch.noButton,0)

sketch.hemaButton.on Events.TouchEnd, ->
	animateButton(sketch.hemaButton, 1, curve1)
	sketch.hemaButton.on Events.AnimationEnd, onTreatSelect(sketch.hemaButton)

sketch.oncoButton.on Events.TouchEnd, ->
	animateButton(sketch.oncoButton, 1, curve1)
	sketch.oncoButton.on Events.AnimationEnd, onTreatSelect(sketch.oncoButton)

sketch.notsureButton.on Events.TouchEnd, ->
	animateButton(sketch.notsureButton, 1, curve1)
	sketch.notsureButton.on Events.AnimationEnd, onNotSureSelect(sketch.notsureButton)

sketch.noButton.on Events.TouchEnd, ->
	animateButton(sketch.noButton, 1, curve1)
	sketch.noButton.on Events.AnimationEnd, onAppSelect(sketch.noButton)

sketch.yesButton.on Events.TouchEnd, ->
	animateButton(sketch.yesButton, 1, curve1)
	sketch.yesButton.on Events.AnimationEnd, onAppSelect(sketch.yesButton)

## Add exit state for Consent Form
exitStateAdd(sketch.Reason_for_visit)

## Detect click on Next button and animate it
moveNext(sketch.nextButtonTreat, sketch.Reason_for_visit, sketch.Select_Character)
sketch.Select_Character.on Events.AnimationEnd, ->
	onLoadAnimation(sketch.charBox)

#############################
## Select Character Screen
#############################

## FUNCTION to anmiate and present elements on character click
onSelectCharacter = (layer) ->
	sketch.selectCharacter.x = layer.x + 76
	sketch.selectCharacter.y = layer.y + 994
	sketch.selectCharacter.visible = true
	preview_layer_char.destroy()
	if layer == sketch.charMeowth
		preview_layer_char = sketch.meowthImage.copy()
	if layer == sketch.charSnorlax
		preview_layer_char = sketch.snorlaxImage.copy()
	if layer == sketch.charCharmander
		preview_layer_char = sketch.charmanderImage.copy()
	if layer == sketch.charCaterpie
		preview_layer_char = sketch.caterpieImage.copy()
	if layer == sketch.charDratini
		preview_layer_char = sketch.dratiniImage.copy()
	preview_layer_char.parent = sketch.Select_Character
	animatePreview(270, 529)

## FUNCTION to add touch events for character screens
addTouchEventChar = (layer) ->
	touchButtons(layer,0)
	layer.on Events.TouchEnd, ->
		animateButton(layer, 1, curve1)
		layer.on Events.AnimationEnd, onSelectCharacter(layer)

addTouchEventChar(sketch.charDraw)
addTouchEventChar(sketch.charDratini)
addTouchEventChar(sketch.charCaterpie)
addTouchEventChar(sketch.charCharmander)
addTouchEventChar(sketch.charSnorlax)
addTouchEventChar(sketch.charMeowth)

## Add exit state for Select Character Page
exitStateAdd(sketch.Select_Character)

## Animations for Next Button
touchButtons(sketch.nextButtonChar,0)
moveNext(sketch.nextButtonChar, sketch.Select_Character, sketch.Select_Gender)

#############################
## Gender Selection Screen
#############################

## Present the Selected Character preview
sketch.Select_Gender.on Events.AnimationEnd, ->
	preview_layer_char.parent = sketch.Select_Gender
	animatePreview(260, 480)
	onLoadAnimation(sketch.genderBox)


onSelectGender = (layer) ->
	sketch.selectGender.x = layer.x + 82
	sketch.selectGender.y = layer.y + 995
	sketch.selectGender.visible = true

addTouchEventGender = (layer) ->
	touchButtons(layer,0)
	layer.on Events.TouchEnd, ->
		animateButton(layer, 1, curve1)
		layer.on Events.AnimationEnd, onSelectGender(layer)

addTouchEventGender(sketch.Boy)
addTouchEventGender(sketch.Girl)

## Add exit state
exitStateAdd(sketch.Select_Gender)

## Animations for Next Button
touchButtons(sketch.nextButtonGender,0)
moveNext(sketch.nextButtonGender, sketch.Select_Gender, sketch.Select_Age)

#############################
## Age Selection Screen
#############################

## Present the Selected Character preview
sketch.Select_Age.on Events.AnimationEnd, ->
	preview_layer_char.parent = sketch.Select_Age
	animatePreview(260, 480)
	onLoadAnimation(sketch.ageBox)

onSelectAgeL = (layer) ->
	sketch.selectAgeL.x = layer.x + 75
	sketch.selectAgeL.y = layer.y + 990
	sketch.selectAgeL.visible = true
	sketch.selectAgeS.visible = false

onSelectAgeS = (layer) ->
	sketch.selectAgeS.x = layer.x + 75
	sketch.selectAgeS.y = layer.y + 990
	sketch.selectAgeS.visible = true
	sketch.selectAgeL.visible = false
	
addTouchEventAgeL = (layer) ->
	touchButtons(layer, 0)
	layer.on Events.TouchEnd, ->
		animateButton(layer, 1, curve1)
		layer.on Events.AnimationEnd, onSelectAgeL(layer)

addTouchEventAgeS = (layer) ->
	touchButtons(layer, 0)
	layer.on Events.TouchEnd, ->
		animateButton(layer, 1, curve1)
		layer.on Events.AnimationEnd, onSelectAgeS(layer)

addTouchEventAgeL(sketch.age11)
addTouchEventAgeL(sketch.age16)
addTouchEventAgeS(sketch.age3)
addTouchEventAgeS(sketch.age4)
addTouchEventAgeS(sketch.age5)
addTouchEventAgeS(sketch.age6)
addTouchEventAgeS(sketch.age7)
addTouchEventAgeS(sketch.age8)
addTouchEventAgeS(sketch.age9)
addTouchEventAgeS(sketch.age10)

## Add exit state
exitStateAdd(sketch.Select_Age)

## Animations for Next Button
touchButtons(sketch.nextButtonAge,0)
moveNext(sketch.nextButtonAge, sketch.Select_Age, sketch.Instructions)


#############################
## Instruction Screen
#############################

## Present the Selected Character preview
sketch.Instructions.on Events.AnimationEnd, ->
	preview_layer_char.parent = sketch.Instructions
	animatePreview(260, 299)

## Add exit state
exitStateAdd(sketch.Instructions)

## Animations for Next Button
touchButtons(sketch.nextButtonIns,0)
moveNext(sketch.nextButtonIns, sketch.Instructions, sketch.QRScan)



#############################
## QRScan Screen
#############################

## Add exit state
exitStateAdd(sketch.QRScan)

sketch.QRScan.on Events.TouchEnd, ->
	sketch.QRScan.animate("exit")
	sketch.selectSmiley.visible = false
	sketch.Story.x = 0
	sketch.Story.y = 0
	sketch.Story.scale = 0.8
	sketch.Story.opacity = 0.5
	sketch.Story.visible = true
	## Detect Character screen animation and then show all other elements
	sketch.Story.animate
		opacity: 1
		scale: 1
		options:
			time: 0.5


#############################
## Story Screen
#############################

## Add exit state
exitStateAdd(sketch.Story)

## Animations for Next Button
touchButtons(sketch.nextButtonStory)

## Detect Touch on Next button and present confirmation screen
sketch.nextButtonStory.on Events.AnimationEnd, ->
	sketch.Popup1.opacity = 0
	sketch.Popup1.visible = true
	sketch.Popup1.animate
		opacity: 1
		options: 
			time: 0.5

## Animations for Continue Button
touchButtons(sketch.continueButton1,0)
moveNext(sketch.continueButton1, sketch.Story, sketch.Smiley)

## Animations for Not continue Button
touchButtons(sketch.exitButton, 0)
moveNext(sketch.exitButton, sketch.Story, sketch.Feedback)


#############################
## Smiley Screen
#############################

## Present the Selected Character preview
sketch.Smiley.on Events.AnimationEnd, ->
	sketch.Popup1.visible = false
	preview_layer_char.parent = sketch.Smiley
	animatePreview(260, 480)
	onLoadAnimation(sketch.smileyBox)

onSelectSmiley = (layer) ->
	sketch.selectSmiley.x = layer.x + 77
	sketch.selectSmiley.y = layer.y + 990
	sketch.selectSmiley.visible = true

addTouchEventSmiley = (layer) ->
	touchButtons(layer, 0)
	layer.on Events.TouchEnd, ->
		animateButton(layer, 1, curve1)
		layer.on Events.AnimationEnd, onSelectSmiley(layer)

addTouchEventSmiley(sketch.happyButton)
addTouchEventSmiley(sketch.calmButton)
addTouchEventSmiley(sketch.confusedButton)
addTouchEventSmiley(sketch.boredButton)
addTouchEventSmiley(sketch.sadButton)

## Add exit state
exitStateAdd(sketch.Smiley)

## Animations for Next Button
touchButtons(sketch.nextButtonSmiley,0)
moveNext(sketch.nextButtonSmiley, sketch.Smiley, sketch.QRScan)


#############################
## Feedback Screen
#############################

## Present the Selected Character preview
sketch.Feedback.on Events.AnimationEnd, ->
	preview_layer_char.parent = sketch.Feedback
	animatePreview(260, 399)

## Add exit state
exitStateAdd(sketch.Feedback)

## Animations for Next Button
touchButtons(sketch.submitButton,0)
sketch.submitButton.on Events.AnimationEnd, ->
	window.location.reload()