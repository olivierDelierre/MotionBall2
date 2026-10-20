// one-off migration helper: adds `declare` fields for properties assigned on `this`
import fs from "node:fs";
for (const file of process.argv.slice(2)) {
	const lines = fs.readFileSync(file, "utf8").split("\n");
	const out = [];
	let i = 0;
	while (i < lines.length) {
		const m = lines[i].match(/^(export )?(default )?class (\w+)/);
		if (!m) { out.push(lines[i++]); continue; }
		let j = i;
		while (!/^}/.test(lines[j])) j++;
		const body = lines.slice(i, j);
		const declared = new Set();
		for (const l of body) {
			let d = l.match(/^\t(?:static |get |set |async |declare )*(#?\w+)\s*(?:\(|:|;|=)/);
			if (d) declared.add(d[1]);
		}
		const found = new Map();
		for (const l of body) {
			const re = /this\.(\w+)\s*(=(?!=)|\+=|-=|\*=)/g;
			let a;
			while ((a = re.exec(l))) {
				if (declared.has(a[1]) || found.has(a[1])) continue;
				let type = "any";
				const rhs = l.slice(a.index + a[0].length).trim().replace(/;$/, "");
				if (a[2] === "=" && l.trim().startsWith("this.")) {
					if (/^-?\d+(\.\d+)?$/.test(rhs)) type = "number";
					else if (/^(true|false)$/.test(rhs)) type = "boolean";
					else if (/^(["'`]).*\1$/.test(rhs)) type = "string";
				}
				found.set(a[1], type);
			}
		}
		out.push(lines[i]);
		if (found.size) {
			for (const [n, t] of found) out.push(`\tdeclare ${n}: ${t};`);
			out.push("");
		}
		for (let k = i + 1; k < j; k++) out.push(lines[k]);
		i = j;
	}
	fs.writeFileSync(file, out.join("\n"));
}
