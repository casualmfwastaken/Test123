import { round, score } from './score.js';

/**
 * Path to directory containing `_list.json` and all levels
 */
const dir = '/data';

// Names of the levels that live in the PLUS list
async function fetchPlusMeta() {
    try {
        const res = await fetch(`${dir}/_list_plus.json`);
        if (!res.ok) throw new Error('missing');
        const data = await res.json();
        const paths = Array.isArray(data) ? data : data?.list;
        return Array.isArray(paths) ? paths : [];
    } catch {
        return [];
    }
}

// Reads a file that is a plain array of level names, or { list: [...] }
async function fetchNames(file) {
    try {
        const res = await fetch(`${dir}/${file}`);
        if (!res.ok) throw new Error('missing');
        const data = await res.json();
        const names = Array.isArray(data) ? data : data?.list;
        return Array.isArray(names) ? names : [];
    } catch {
        return [];
    }
}

export async function fetchList() {
    try {
        const listResult = await fetch(`${dir}/_list.json`);
        const [plusNames, unvNames] = await Promise.all([
            fetchNames('_list_plus.json'),
            fetchNames('_unverified_list.json'),
        ]);
        const plus = new Set(plusNames);
        const unv = new Set(unvNames.filter((p) => !plus.has(p)));
        const main = (await listResult.json()).filter((p) => !plus.has(p) && !unv.has(p));
        const paths = [...main, ...unv]; // unverified levels go last, in file order

        return await Promise.all(
            paths.map(async (path, rank) => {
                try {
                    const levelResult = await fetch(`${dir}/${path}.json`);
                    const level = await levelResult.json();
                    return [
                        {
                            ...level,
                            path,
                            unverified: unv.has(path),
                            records: [...(level.records || [])].sort(
                                (a, b) => b.percent - a.percent,
                            ),
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load level #${rank + 1} ${path}.`);
                    return [null, path];
                }
            }),
        );
    } catch {
        console.error(`Failed to load list.`);
        return null;
    }
}
export async function fetchEditors() {
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        const editors = await editorsResults.json();
        return editors;
    } catch {
        return null;
    }
}

export async function fetchLeaderboard() {
    const list = (await fetchList()) || [];

    const scoreMap = {};
    const errs = [];
    let rank = 0; // only verified levels take a rank, same as the list page

    list.forEach(([level, err]) => {
        if (err) {
            errs.push(err);
            return;
        }

        // Unverified levels: no verifier credit, no records, no points
        const verifierName = (level.verifier || '').trim();
        if (!verifierName) return;

        rank += 1;

        // Verification
        const verifier = Object.keys(scoreMap).find(
            (u) => u.toLowerCase() === verifierName.toLowerCase(),
        ) || verifierName;
        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
        };
        const { verified } = scoreMap[verifier];
        verified.push({
            rank,
            level: level.name,
            score: score(rank, 100, level.percentToQualify),
            link: level.verification,
        });

        // Records
        (level.records || []).forEach((record) => {
            if (!record?.user) return;
            const user = Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === record.user.toLowerCase(),
            ) || record.user;
            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank,
                    level: level.name,
                    score: score(rank, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank,
                level: level.name,
                percent: record.percent,
                score: score(rank, record.percent, level.percentToQualify),
                link: record.link,
            });
        });
    });

    // Wrap in extra Object containing the user and total score
    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const total = [verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    // Sort by total score
    return [res.sort((a, b) => b.total - a.total), errs];
}
