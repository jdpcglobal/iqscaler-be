// server/utils/iqCalculator.js

export const getIQRange = (percentile) => {
    // Clamp percentile to avoid infinity
    let p = Math.min(Math.max(percentile / 100, 0.0001), 0.9999);

    // Approximation of inverse normal (Probit)
    function inverseNormal(p) {
        const a1 = -39.6968302866538,
            a2 = 220.946098424521,
            a3 = -275.928510446969,
            a4 = 138.357751867269,
            a5 = -30.6647980661472,
            a6 = 2.50662827745924;

        const b1 = -54.4760987982241,
            b2 = 161.58583685804,
            b3 = -155.698979859886,
            b4 = 66.8013118877197,
            b5 = -13.2806815528857;

        const c1 = -0.00778489400243029,
            c2 = -0.322396458041136,
            c3 = -2.40075827716183,
            c4 = -2.54973253934373,
            c5 = 4.37466414146496,
            c6 = 2.93816398269878;

        const d1 = 0.00778469570904146,
            d2 = 0.322467129070039,
            d3 = 2.44513413714299,
            d4 = 3.75440866190741;

        let q, r, x;

        if (p < 0.02425) {
            q = Math.sqrt(-2 * Math.log(p));
            x = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        } else if (p > 1 - 0.02425) {
            q = Math.sqrt(-2 * Math.log(1 - p));
            x = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        } else {
            q = p - 0.5;
            r = q * q;
            x = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
                (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
        }
        return x;
    }

    const zScore = inverseNormal(p);
    
    // Standard IQ parameters: Mean = 100, SD = 15
    const exactIQ = Math.round(100 + (zScore * 15));

    return {
        score: exactIQ
    };
};