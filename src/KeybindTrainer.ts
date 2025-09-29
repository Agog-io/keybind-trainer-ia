import { existsSync, readFileSync } from "fs";
import * as vscode from "vscode";
import { keybindsFilePathKey } from "./constants";
import { Keybind } from "./types";
import JSONC from "tiny-jsonc";
import { homedir } from "os";
const untildify = (str: string) => str.replace(/^~($|\/|\\)/, `${homedir()}$1`);

export class KeybindTrainer {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */

	private static keybinds: Keybind[] = [];

	private _disposables: vscode.Disposable[] = [];

	public static showNotification() {
		this._getKeybinds();
		let strarr: string[][] = [];
		let maxLenLabel = 0;
		let retStr = "";
		this.keybinds.forEach((kb) => {
			let label = kb.label ? kb.label : kb.command;
			let keys = kb.keys
				.join(" ")
				.replace("shift", "shft")
				.replace("backspace", "bcks");
			strarr.push([label, keys]);
			if (maxLenLabel < label.length) {
				maxLenLabel = label.length;
			}
		});

		for (let index = 0; index < strarr.length; index++) {
			strarr[index][0] = strarr[index][0].padEnd(maxLenLabel, "-");
			retStr += strarr[index][0] + " -> " + strarr[index][1] + "\n";
		}

		vscode.window.showInformationMessage(retStr, {
			modal: true,
		});
	}

	private static _getKeybinds() {
		let fileDirectory = vscode.workspace
			.getConfiguration("keybind-trainer")
			.get<string>(keybindsFilePathKey);

		if (fileDirectory) {
			fileDirectory = untildify(fileDirectory);
		}

		if (fileDirectory === undefined || !existsSync(fileDirectory)) {
			// vscode.window.showErrorMessage(
			//   `Setting: 'keybind-trainer.${keybindsFilePathKey}' is invalid or does not exist on file`
			// );

			console.error(
				"Cannot read keybindsFilePathKey setting. Invalid path or not exists"
			);
			return;
		}

		var obj = JSONC.parse(readFileSync(fileDirectory, "utf8")) as {
			command: string;
			key: string;
			label?: string;
			args: any;
		}[];

		let parsedAndFormatted: Keybind[] = [];

		let commands = new Set();

		// Parse keys into better format
		for (let keybind of obj) {
			if (commands.has(keybind.command)) {
				// TODO: Ask user to define which duplicate command to include
				// As some default commands the user doens't want to use
				console.log(keybind.command, "exists");
			} else {
				commands.add(keybind.command);
			}
			if (keybind.command.length > 1 && keybind.command[0] === "-") {
				console.log("keybind starts with - ", keybind.command);

				continue;
			} else {
				console.log("keybind not starts with - ", keybind.command);
			}
			let keyStr = keybind.key;

			// Check that the keybind has keys set
			if (
				keyStr !== "" &&
				keybind.label !== undefined &&
				keybind.label !== ""
			) {
				parsedAndFormatted.push({
					command: keybind.label,
					keys: keyStr.split(" "),
				});
			}
		}

		this.keybinds = parsedAndFormatted;
	}

	public dispose() {
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}
}
